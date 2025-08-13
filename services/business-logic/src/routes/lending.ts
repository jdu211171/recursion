import { Router, Request, Response } from 'express';
import { lendingService } from '../services/lendingService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/lending/checkout - Checkout an item
router.post('/checkout', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { itemId, borrowerId, dueDate, notes } = req.body;

  if (!itemId || !borrowerId || !dueDate) {
    throw new AppError('itemId, borrowerId, and dueDate are required', 400);
  }

  // Staff can checkout for any user, borrowers only for themselves
  if (context.role === 'BORROWER' && borrowerId !== context.userId) {
    throw new AppError('Borrowers can only checkout items for themselves', 403);
  }

  const lending = await lendingService.checkoutItem({
    itemId,
    borrowerId,
    dueDate: new Date(dueDate),
    notes
  }, context);

  res.status(201).json(lending);
}));

// POST /api/lending/:id/return - Return an item
router.post('/:id/return', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const lending = await lendingService.returnItem(req.params.id, context);
  res.json(lending);
}));

// GET /api/lending - Get lending history
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const filters = {
    userId: req.query.userId as string,
    itemId: req.query.itemId as string,
    isActive: req.query.isActive === 'true',
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  // Borrowers can only see their own history
  if (context.role === 'BORROWER') {
    filters.userId = context.userId;
  }

  const result = await lendingService.getLendingHistory(filters, context);
  res.json(result);
}));

// GET /api/lending/:id/penalty - Calculate penalty for a lending
router.get('/:id/penalty', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const penalty = await lendingService.calculatePenalty(req.params.id, context);
  res.json(penalty);
}));

// POST /api/lending/:id/penalty/override - Override penalty (admin only)
router.post('/:id/penalty/override', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { newPenalty, reason } = req.body;

  if (typeof newPenalty !== 'number' || !reason) {
    throw new AppError('newPenalty (number) and reason are required', 400);
  }

  const lending = await lendingService.overridePenalty(req.params.id, newPenalty, reason, context);
  res.json(lending);
}));

// POST /api/lending/blacklist - Apply blacklist to a user (admin/staff only)
router.post('/blacklist', requireRole(['ADMIN', 'STAFF']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { userId, reason, daysBlocked } = req.body;

  if (!userId || !reason || !daysBlocked) {
    throw new AppError('userId, reason, and daysBlocked are required', 400);
  }

  const blacklist = await lendingService.applyBlacklist(userId, reason, daysBlocked, context);
  res.status(201).json(blacklist);
}));

// DELETE /api/lending/blacklist/:id - Remove blacklist (admin only)
router.delete('/blacklist/:id', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const blacklist = await lendingService.removeBlacklist(req.params.id, context);
  res.json(blacklist);
}));

export default router;