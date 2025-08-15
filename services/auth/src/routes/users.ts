import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { verifyToken, requireRole, validateTenantContext } from '../middleware/auth';

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

export class UserController {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getAllUsers = async (req: Request, res: Response) => {
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
        this.prisma.user.findMany({
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
        this.prisma.user.count({ where })
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
  };

  getUserById = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (req.user!.userId !== userId && 
          ![UserRole.ADMIN, UserRole.STAFF].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
  
      const user = await this.prisma.user.findFirst({
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
          organization: { select: { id: true, name: true } },
          instance: { select: { id: true, name: true } }
        }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, role, instanceId, isActive, password } = req.body;
  
      const isAdmin = req.user!.role === UserRole.ADMIN;
      const isStaff = req.user!.role === UserRole.STAFF;
      const isSelf = req.user!.userId === userId;
  
      if (!isSelf && !isAdmin && !isStaff) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
  
      const existingUser = await this.prisma.user.findFirst({
        where: { id: userId, orgId: req.user!.orgId }
      });
  
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const updateData: any = {};
  
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
  
      if (isAdmin) {
        if (email !== undefined) {
          const emailExists = await this.prisma.user.findFirst({
            where: { email, id: { not: userId } }
          });
          if (emailExists) {
            return res.status(409).json({ error: 'Email already in use' });
          }
          updateData.email = email;
        }
        if (role !== undefined) updateData.role = role;
        if (instanceId !== undefined) updateData.instanceId = instanceId;
        if (isActive !== undefined) updateData.isActive = isActive;
      }
  
      if (password && (isAdmin || isSelf)) {
        const hashLib = this.bcrypt ?? bcrypt;
        updateData.password = await hashLib.hash(password, SALT_ROUNDS);
      }
  
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true, orgId: true, instanceId: true, isActive: true, updatedAt: true
        }
      });
  
      res.json(updateData);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
  
      if (req.user!.userId === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
  
      const user = await this.prisma.user.findFirst({
        where: { id: userId, orgId: req.user!.orgId }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
  
      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  createUser = async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, contactInfo, role = UserRole.BORROWER, instanceId }: CreateUserBody = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
  
      const existingUser = await this.prisma.user.findUnique({
        where: { email }
      });
  
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
  
      const hashLib = this.bcrypt ?? bcrypt;
      const hashedPassword = await hashLib.hash(password, SALT_ROUNDS);
  
      const newUser = await this.prisma.$transaction(async (tx: any) => {
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
            id: true, email: true, firstName: true, lastName: true, contactInfo: true, role: true, orgId: true, instanceId: true, isActive: true, createdAt: true
          }
        });
  
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
  };
}

const prisma = new PrismaClient();
const userController = new UserController(prisma, bcrypt);
const router = Router();

// Get all users (admin only, filtered by organization)
router.get('/', verifyToken, requireRole([UserRole.ADMIN]), userController.getAllUsers);

// Get user by ID (admin/staff or self)
router.get('/:userId', verifyToken, userController.getUserById);

// Update user (admin/staff or self for limited fields)
router.put('/:userId', verifyToken, userController.updateUser);

// Delete user (admin only)
router.delete('/:userId', verifyToken, requireRole([UserRole.ADMIN]), userController.deleteUser);

// Create new user (admin only)
router.post('/', verifyToken, requireRole([UserRole.ADMIN]), userController.createUser);

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
        instanceId: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
