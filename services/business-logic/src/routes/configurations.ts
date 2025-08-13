import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all feature flags
router.get('/feature-flags', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const featureFlags = await prisma.featureFlag.findMany({
      orderBy: { name: 'asc' }
    });

    // Get enabled features for the user's organization
    const orgConfig = await prisma.orgConfiguration.findFirst({
      where: {
        orgId: req.user!.orgId,
        instanceId: req.user!.instanceId || null
      },
      select: { enabledFeatures: true }
    });

    const enabledFeatures = orgConfig?.enabledFeatures as string[] || [];

    // Add enabled status to each flag
    const flagsWithStatus = featureFlags.map(flag => ({
      ...flag,
      enabled: enabledFeatures.includes(flag.name)
    }));

    res.json(flagsWithStatus);
  } catch (error) {
    console.error('Get feature flags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create feature flag (super admin only)
router.post('/feature-flags', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name, description, defaultEnabled, requiresRole } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Feature flag name is required' });
      return;
    }

    const featureFlag = await prisma.featureFlag.create({
      data: {
        name,
        description,
        defaultEnabled: defaultEnabled || false,
        requiresRole
      }
    });

    res.status(201).json(featureFlag);
  } catch (error) {
    console.error('Create feature flag error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Feature flag with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get custom field definitions for organization
router.get('/custom-fields', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType } = req.query;

    const where: any = {
      orgId: req.user!.orgId
    };

    if (entityType) {
      where.entityType = entityType;
    }

    const customFields = await prisma.customFieldDefinition.findMany({
      where,
      orderBy: [
        { entityType: 'asc' },
        { displayOrder: 'asc' },
        { fieldName: 'asc' }
      ]
    });

    res.json(customFields);
  } catch (error) {
    console.error('Get custom fields error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom field definition
router.post('/custom-fields', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { entityType, fieldName, fieldType, fieldConfig, isRequired, displayOrder } = req.body;

    if (!entityType || !fieldName || !fieldType) {
      res.status(400).json({ error: 'Entity type, field name, and field type are required' });
      return;
    }

    const customField = await prisma.$transaction(async (tx) => {
      const field = await tx.customFieldDefinition.create({
        data: {
          orgId: req.user!.orgId,
          entityType,
          fieldName,
          fieldType,
          fieldConfig: fieldConfig || {},
          isRequired: isRequired || false,
          displayOrder: displayOrder || 0
        }
      });

      // Log activity
      await tx.customizationAuditLog.create({
        data: {
          orgId: req.user!.orgId,
          userId: req.user!.userId,
          action: 'CREATE_CUSTOM_FIELD',
          entityType: 'custom_field',
          entityId: field.id,
          newValue: field
        }
      });

      return field;
    });

    res.status(201).json(customField);
  } catch (error) {
    console.error('Create custom field error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Custom field with this name already exists for this entity type' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update custom field definition
router.put('/custom-fields/:fieldId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const { fieldConfig, isRequired, displayOrder } = req.body;

    const customField = await prisma.$transaction(async (tx) => {
      // Verify field belongs to organization
      const existing = await tx.customFieldDefinition.findFirst({
        where: {
          id: fieldId,
          orgId: req.user!.orgId
        }
      });

      if (!existing) {
        throw new Error('Custom field not found');
      }

      const updateData: any = {};
      if (fieldConfig !== undefined) updateData.fieldConfig = fieldConfig;
      if (isRequired !== undefined) updateData.isRequired = isRequired;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      const field = await tx.customFieldDefinition.update({
        where: { id: fieldId },
        data: updateData
      });

      // Log activity
      await tx.customizationAuditLog.create({
        data: {
          orgId: req.user!.orgId,
          userId: req.user!.userId,
          action: 'UPDATE_CUSTOM_FIELD',
          entityType: 'custom_field',
          entityId: field.id,
          oldValue: existing,
          newValue: field
        }
      });

      return field;
    });

    res.json(customField);
  } catch (error) {
    console.error('Update custom field error:', error);
    if ((error as Error).message === 'Custom field not found') {
      res.status(404).json({ error: 'Custom field not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete custom field definition
router.delete('/custom-fields/:fieldId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;

    await prisma.$transaction(async (tx) => {
      // Verify field belongs to organization
      const existing = await tx.customFieldDefinition.findFirst({
        where: {
          id: fieldId,
          orgId: req.user!.orgId
        }
      });

      if (!existing) {
        throw new Error('Custom field not found');
      }

      // Delete the field
      await tx.customFieldDefinition.delete({
        where: { id: fieldId }
      });

      // Log activity
      await tx.customizationAuditLog.create({
        data: {
          orgId: req.user!.orgId,
          userId: req.user!.userId,
          action: 'DELETE_CUSTOM_FIELD',
          entityType: 'custom_field',
          entityId: fieldId,
          oldValue: existing
        }
      });
    });

    res.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('Delete custom field error:', error);
    if ((error as Error).message === 'Custom field not found') {
      res.status(404).json({ error: 'Custom field not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get lending policies
router.get('/lending-policies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policies = await prisma.lendingPolicy.findMany({
      where: {
        orgId: req.user!.orgId,
        isActive: true
      },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(policies);
  } catch (error) {
    console.error('Get lending policies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lending policy
router.post('/lending-policies', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      itemCategory, 
      userRole, 
      maxDays, 
      maxItems, 
      requiresApproval, 
      penaltyRules, 
      priority 
    } = req.body;

    if (!name || !maxDays || !maxItems) {
      res.status(400).json({ error: 'Name, max days, and max items are required' });
      return;
    }

    const policy = await prisma.$transaction(async (tx) => {
      const newPolicy = await tx.lendingPolicy.create({
        data: {
          orgId: req.user!.orgId,
          instanceId: req.user!.instanceId,
          name,
          description,
          itemCategory,
          userRole,
          maxDays,
          maxItems,
          requiresApproval: requiresApproval || false,
          penaltyRules: penaltyRules || { latePerDay: 1.0, lost: 50.0 },
          priority: priority || 0
        }
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: req.user!.orgId,
          action: 'CREATE_LENDING_POLICY',
          entityType: 'lending_policy',
          entityId: newPolicy.id,
          metadata: { name, maxDays, maxItems }
        }
      });

      return newPolicy;
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error('Create lending policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lending policy
router.put('/lending-policies/:policyId', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const updateData = req.body;

    const policy = await prisma.$transaction(async (tx) => {
      // Verify policy belongs to organization
      const existing = await tx.lendingPolicy.findFirst({
        where: {
          id: policyId,
          orgId: req.user!.orgId
        }
      });

      if (!existing) {
        throw new Error('Lending policy not found');
      }

      const updated = await tx.lendingPolicy.update({
        where: { id: policyId },
        data: updateData
      });

      // Log activity
      await tx.userActivityLog.create({
        data: {
          userId: req.user!.userId,
          orgId: req.user!.orgId,
          action: 'UPDATE_LENDING_POLICY',
          entityType: 'lending_policy',
          entityId: policyId,
          metadata: { changes: updateData }
        }
      });

      return updated;
    });

    res.json(policy);
  } catch (error) {
    console.error('Update lending policy error:', error);
    if ((error as Error).message === 'Lending policy not found') {
      res.status(404).json({ error: 'Lending policy not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get customization audit log
router.get('/audit-log', authMiddleware, requireRole([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, entityType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      orgId: req.user!.orgId
    };

    if (entityType) {
      where.entityType = entityType;
    }

    const [logs, total] = await Promise.all([
      prisma.customizationAuditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.customizationAuditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;