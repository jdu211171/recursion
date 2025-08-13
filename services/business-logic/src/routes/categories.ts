import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// GET /api/categories - Get all categories for the tenant
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const categories = await prisma.category.findMany({
    where: {
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId })
    },
    orderBy: { name: 'asc' }
  });

  res.json(categories);
}));

// POST /api/categories - Create new category (admin/staff only)
router.post('/', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { name, description } = req.body;

  if (!name) {
    throw new AppError('Category name is required', 400);
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
      orgId: context.orgId,
      instanceId: context.instanceId
    }
  });

  res.status(201).json(category);
}));

// PUT /api/categories/:id - Update category (admin/staff only)
router.put('/:id', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { name, description } = req.body;

  // Verify category belongs to tenant
  const existing = await prisma.category.findFirst({
    where: {
      id: req.params.id,
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId })
    }
  });

  if (!existing) {
    throw new AppError('Category not found', 404);
  }

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, description }
  });

  res.json(category);
}));

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  // Verify category belongs to tenant and has no items
  const category = await prisma.category.findFirst({
    where: {
      id: req.params.id,
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId })
    },
    include: {
      _count: {
        select: { items: true }
      }
    }
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (category._count.items > 0) {
    throw new AppError('Cannot delete category with existing items', 400);
  }

  await prisma.category.delete({
    where: { id: req.params.id }
  });

  res.status(204).send();
}));

export default router;