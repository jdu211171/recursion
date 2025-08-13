import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole, Organization } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get current user's organization(s)
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            configVersion: true,
            deploymentType: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                instances: true,
                users: true,
                items: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Return as array for consistency with frontend expectations
    res.json([user.organization]);
  } catch (error) {
    console.error('Get user organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all organizations (admin only)
router.get('/', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        configVersion: true,
        deploymentType: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            instances: true,
            users: true,
            items: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(organizations);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization by ID
router.get('/:orgId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    // Users can only view their own organization
    if (req.user!.orgId !== Number(orgId) && req.user!.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: Number(orgId) },
      include: {
        instances: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                users: true,
                items: true
              }
            }
          }
        },
        configurations: {
          where: { instanceId: null }, // Org-level config only
          take: 1
        },
        _count: {
          select: {
            users: true,
            items: true,
            lendings: true
          }
        }
      }
    });

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create organization (super admin only - would need special role)
router.post('/', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name, deploymentType = 'shared' } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Organization name is required' });
      return;
    }

    const organization = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name,
          deploymentType
        }
      });

      // Create default configuration
      await tx.orgConfiguration.create({
        data: {
          orgId: org.id,
          maxLendingDays: 7,
          latePenaltyPerDay: 1.0,
          maxItemsPerUser: 5
        }
      });

      // Create default lending policy
      await tx.lendingPolicy.create({
        data: {
          orgId: org.id,
          name: 'Default Policy',
          description: 'Standard lending policy for all users',
          max_lending_days: 7,
          max_items_per_user: 5,
          penaltyRules: {
            latePerDay: 1.0,
            lost: 50.0
          }
        }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: org.id,
          action: 'CREATE_ORGANIZATION',
          entityType: 'organization',
          entityId: org.id.toString(),
          metadata: { name, deploymentType }
        }
      });

      return org;
    });

    res.status(201).json(organization);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization
router.put('/:orgId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { name, deploymentType } = req.body;

    // Users can only update their own organization
    if (req.user!.orgId !== Number(orgId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const updateData: Partial<Pick<Organization, 'name' | 'deploymentType'>> = {};
    if (name !== undefined) updateData.name = name;
    if (deploymentType !== undefined) updateData.deploymentType = deploymentType;

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: Number(orgId) },
        data: {
          ...updateData,
          configVersion: { increment: 1 }
        }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: org.id,
          action: 'UPDATE_ORGANIZATION',
          entityType: 'organization',
          entityId: org.id.toString(),
          metadata: updateData
        }
      });

      return org;
    });

    res.json(organization);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization configuration
router.get('/:orgId/configuration', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { instanceId } = req.query;

    // Users can only view their own organization's config
    if (req.user!.orgId !== Number(orgId) && req.user!.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const configuration = await prisma.orgConfiguration.findFirst({
      where: {
        orgId: Number(orgId),
        instanceId: instanceId ? Number(instanceId) : null
      }
    });

    if (!configuration) {
      // Return default configuration if none exists
      res.json({
        maxLendingDays: 7,
        latePenaltyPerDay: 1.0,
        maxItemsPerUser: 5,
        requireApproval: false,
        allowExtensions: true,
        maxExtensions: 2,
        autoBlacklist: true,
        blacklistThresholdFirst: 3,
        blacklistThresholdSecond: 7,
        blacklistThresholdThird: 30,
        themeConfig: {},
        enabledFeatures: [],
        customFields: {},
        emailTemplates: {}
      });
      return;
    }

    res.json(configuration);
  } catch (error) {
    console.error('Get configuration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization configuration
router.put('/:orgId/configuration', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { instanceId, ...configData } = req.body;

    // Users can only update their own organization's config
    if (req.user!.orgId !== Number(orgId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const configuration = await prisma.$transaction(async (tx) => {
      // Check if configuration exists
      const existing = await tx.orgConfiguration.findFirst({
        where: {
          orgId: Number(orgId),
          instanceId: instanceId ? Number(instanceId) : null
        }
      });

      let config;
      if (existing) {
        // Update existing
        config = await tx.orgConfiguration.update({
          where: { id: existing.id },
          data: configData
        });
      } else {
        // Create new
        config = await tx.orgConfiguration.create({
          data: {
            orgId: Number(orgId),
            instanceId: instanceId ? Number(instanceId) : null,
            ...configData
          }
        });
      }

      // Log activity
      await tx.customizationAuditLog.create({
        data: {
          orgId: Number(orgId),
          userId: req.user!.userId,
          action: existing ? 'UPDATE' : 'CREATE',
          entityType: 'configuration',
          entityId: config.id,
          oldValue: existing || undefined,
          newValue: config
        }
      });

      // Update organization version
      await tx.organization.update({
        where: { id: Number(orgId) },
        data: { configVersion: { increment: 1 } }
      });

      return config;
    });

    res.json(configuration);
  } catch (error) {
    console.error('Update configuration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization instances
router.get('/:orgId/instances', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    // Users can only view their own organization's instances
    if (req.user!.orgId !== Number(orgId) && req.user!.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const instances = await prisma.instance.findMany({
      where: { orgId: Number(orgId) },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            items: true,
            categories: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(instances);
  } catch (error) {
    console.error('Get instances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create instance
router.post('/:orgId/instances', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { name } = req.body;

    // Users can only create instances in their own organization
    if (req.user!.orgId !== Number(orgId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Instance name is required' });
      return;
    }

    const instance = await prisma.$transaction(async (tx) => {
      const inst = await tx.instance.create({
        data: {
          name,
          orgId: Number(orgId)
        }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: Number(orgId),
          action: 'CREATE_INSTANCE',
          entityType: 'instance',
          entityId: inst.id.toString(),
          metadata: { name }
        }
      });

      return inst;
    });

    res.status(201).json(instance);
  } catch (error) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update instance
router.put('/:orgId/instances/:instanceId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { orgId, instanceId } = req.params;
    const { name } = req.body;

    // Users can only update instances in their own organization
    if (req.user!.orgId !== Number(orgId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const instance = await prisma.$transaction(async (tx) => {
      // Verify instance belongs to organization
      const existing = await tx.instance.findFirst({
        where: {
          id: Number(instanceId),
          orgId: Number(orgId)
        }
      });

      if (!existing) {
        throw new Error('Instance not found');
      }

      const inst = await tx.instance.update({
        where: { id: Number(instanceId) },
        data: { name }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: Number(orgId),
          action: 'UPDATE_INSTANCE',
          entityType: 'instance',
          entityId: inst.id.toString(),
          metadata: { oldName: existing.name, newName: name }
        }
      });

      return inst;
    });

    res.json(instance);
  } catch (error) {
    console.error('Update instance error:', error);
    if ((error as Error).message === 'Instance not found') {
      res.status(404).json({ error: 'Instance not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete instance (soft delete by deactivating all items and users)
router.delete('/:orgId/instances/:instanceId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { orgId, instanceId } = req.params;

    // Users can only delete instances in their own organization
    if (req.user!.orgId !== Number(orgId)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Verify instance belongs to organization
      const instance = await tx.instance.findFirst({
        where: {
          id: Number(instanceId),
          orgId: Number(orgId)
        }
      });

      if (!instance) {
        throw new Error('Instance not found');
      }

      // Check for active lendings
      const activeLendings = await tx.lending.count({
        where: {
          instanceId: Number(instanceId),
          returnedAt: null
        }
      });

      if (activeLendings > 0) {
        throw new Error('Cannot delete instance with active lendings');
      }

      // Deactivate all users in the instance
      await tx.user.updateMany({
        where: { instanceId: Number(instanceId) },
        data: { isActive: false }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: Number(orgId),
          action: 'DELETE_INSTANCE',
          entityType: 'instance',
          entityId: instanceId,
          metadata: { name: instance.name }
        }
      });
    });

    res.json({ message: 'Instance deactivated successfully' });
  } catch (error) {
    console.error('Delete instance error:', error);
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Instance not found') {
      res.status(404).json({ error: 'Instance not found' });
    } else if (errorMessage === 'Cannot delete instance with active lendings') {
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;