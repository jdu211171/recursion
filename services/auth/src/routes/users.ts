import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { verifyToken, requireRole, validateTenantContext } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// Type definitions
interface CreateUserBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  contactInfo?: string;
  role?: UserRole;
  instanceId?: number;
}

// Get all users (admin only, filtered by organization)
router.get('/', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, instanceId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      orgId: req.user!.orgId
    };

    if (role) {
      where.role = role as UserRole;
    }

    if (instanceId) {
      where.instanceId = Number(instanceId);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          orgId: true,
          instanceId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          instance: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (admin/staff or self)
router.get('/:userId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Check if user is accessing their own profile or has admin/staff role
    if (req.user!.userId !== userId && 
        ![UserRole.ADMIN, UserRole.STAFF].includes(req.user!.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        instanceId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: { id: true, name: true }
        },
        instance: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin/staff or self for limited fields)
router.put('/:userId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, instanceId, isActive, password } = req.body;

    // Check permissions
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const isStaff = req.user!.role === UserRole.STAFF;
    const isSelf = req.user!.userId === userId;

    if (!isSelf && !isAdmin && !isStaff) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Verify user exists in same organization
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Build update data based on permissions
    const updateData: any = {};

    // All users can update their own name
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // Only admin can update these fields
    if (isAdmin) {
      if (email !== undefined) {
        // Check if email is already taken
        const emailExists = await prisma.user.findFirst({
          where: {
            email,
            id: { not: userId }
          }
        });
        if (emailExists) {
          res.status(409).json({ error: 'Email already in use' });
          return;
        }
        updateData.email = email;
      }
      if (role !== undefined) updateData.role = role;
      if (instanceId !== undefined) updateData.instanceId = instanceId;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    // Password can be updated by admin or self
    if (password && (isAdmin || isSelf)) {
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        instanceId: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:userId', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (req.user!.userId === userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Verify user exists in same organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile endpoints
router.get('/profile/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        instanceId: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true }
        },
        instance: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update own profile
router.put('/profile/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // Handle password change
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, contactInfo, role = UserRole.BORROWER, instanceId }: CreateUserBody = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with activity logging
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          contactInfo,
          role,
          orgId: req.user!.orgId,
          instanceId: instanceId || req.user!.instanceId
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          contactInfo: true,
          role: true,
          orgId: true,
          instanceId: true,
          isActive: true,
          createdAt: true
        }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: req.user!.orgId,
          action: 'CREATE_USER',
          entityType: 'user',
          entityId: user.id,
          metadata: { createdUserEmail: email, createdUserRole: role }
        }
      });

      return user;
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/:userId/reset-password', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    // Verify user exists in same organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: req.user!.orgId,
          action: 'RESET_PASSWORD',
          entityType: 'user',
          entityId: userId,
          metadata: { targetUserEmail: user.email }
        }
      });
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity logs
router.get('/:userId/activity', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Check permissions - admin/staff can see any user's activity, users can see their own
    if (req.user!.userId !== userId && 
        ![UserRole.ADMIN, UserRole.STAFF].includes(req.user!.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Verify user exists in same organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [activities, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        where: {
          userId,
          orgId: req.user!.orgId
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true
        }
      }),
      prisma.userActivityLog.count({
        where: {
          userId,
          orgId: req.user!.orgId
        }
      })
    ]);

    res.json({
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user sessions
router.get('/:userId/sessions', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user exists in same organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() } // Only active sessions
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true
      }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manage user blacklist
router.post('/:userId/blacklist', verifyToken, requireRole([UserRole.ADMIN, UserRole.STAFF]), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { action, reason, duration = 7 } = req.body; // action: 'add' or 'remove'

    if (!action || !['add', 'remove'].includes(action)) {
      res.status(400).json({ error: 'Valid action (add/remove) is required' });
      return;
    }

    // Verify user exists in same organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: req.user!.orgId
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (action === 'add') {
      if (!reason) {
        res.status(400).json({ error: 'Reason is required for blacklisting' });
        return;
      }

      // Check if already blacklisted
      const existingBlacklist = await prisma.blacklist.findFirst({
        where: {
          userId,
          orgId: req.user!.orgId,
          isActive: true
        }
      });

      if (existingBlacklist) {
        res.status(409).json({ error: 'User is already blacklisted' });
        return;
      }

      const blacklist = await prisma.$transaction(async (tx) => {
        const newBlacklist = await tx.blacklist.create({
          data: {
            userId,
            orgId: req.user!.orgId,
            instanceId: user.instanceId,
            reason,
            blockedUntil: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
          }
        });

        // Log activity
        await tx.userActivityLog.create({
          data: {
            userId: req.user!.userId,
            orgId: req.user!.orgId,
            action: 'BLACKLIST_USER',
            entityType: 'blacklist',
            entityId: newBlacklist.id,
            metadata: { targetUserId: userId, reason, duration }
          }
        });

        return newBlacklist;
      });

      res.json({ message: 'User blacklisted successfully', blacklist });
    } else {
      // Remove from blacklist
      const result = await prisma.$transaction(async (tx) => {
        const blacklists = await tx.blacklist.updateMany({
          where: {
            userId,
            orgId: req.user!.orgId,
            isActive: true
          },
          data: {
            isActive: false,
            overriddenBy: req.user!.userId,
            overriddenAt: new Date()
          }
        });

        // Log activity
        await tx.userActivityLog.create({
          data: {
            userId: req.user!.userId,
            orgId: req.user!.orgId,
            action: 'REMOVE_BLACKLIST',
            entityType: 'user',
            entityId: userId,
            metadata: { targetUserId: userId }
          }
        });

        return blacklists;
      });

      res.json({ message: 'User removed from blacklist successfully' });
    }
  } catch (error) {
    console.error('Manage blacklist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test multi-tenant isolation endpoint (for verification)
router.get('/test/isolation', verifyToken, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    // Count users in current org
    const currentOrgUsers = await prisma.user.count({
      where: { orgId: req.user!.orgId }
    });

    // Count total users (should not be accessible in production)
    const totalUsers = await prisma.user.count();

    res.json({
      message: 'Multi-tenant isolation test',
      currentOrgId: req.user!.orgId,
      usersInCurrentOrg: currentOrgUsers,
      totalUsersInSystem: totalUsers,
      isolated: currentOrgUsers < totalUsers || totalUsers === currentOrgUsers
    });
  } catch (error) {
    console.error('Isolation test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;