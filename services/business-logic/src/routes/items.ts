import { Router, Request, Response } from 'express';
import { itemService } from '../services/itemService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/items - Get all items with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const filters = {
    search: req.query.search as string,
    categoryId: req.query.categoryId as string,
    isAvailable: req.query.isAvailable !== undefined ? req.query.isAvailable === 'true' : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  const result = await itemService.getItems(filters, context);
  res.json(result);
}));

// GET /api/items/:id - Get single item
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const item = await itemService.getItemById(req.params.id, context);
  res.json(item);
}));

// POST /api/items - Create new item (admin/staff only)
router.post('/', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const item = await itemService.createItem(req.body, context);
  res.status(201).json(item);
}));

// PUT /api/items/:id - Update item (admin/staff only)
router.put('/:id', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const item = await itemService.updateItem(req.params.id, req.body, context);
  res.json(item);
}));

// DELETE /api/items/:id - Delete item (admin only)
router.delete('/:id', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  await itemService.deleteItem(req.params.id, context);
  res.status(204).send();
}));

export default router;