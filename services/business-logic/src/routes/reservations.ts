import { Router, Request, Response } from 'express';
import { reservationService } from '../services/reservationService';
import { authMiddleware } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/reservations - Create a reservation
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { itemId, userId, reservedFor, notes } = req.body;

  if (!itemId || !reservedFor) {
    throw new AppError('itemId and reservedFor are required', 400);
  }

  // Borrowers can only create reservations for themselves
  const reservationUserId = userId || context.userId;
  if (context.role === 'BORROWER' && reservationUserId !== context.userId) {
    throw new AppError('Borrowers can only create reservations for themselves', 403);
  }

  const reservation = await reservationService.createReservation({
    itemId,
    userId: reservationUserId,
    reservedFor: new Date(reservedFor),
    notes
  }, context);

  res.status(201).json(reservation);
}));

// GET /api/reservations - Get reservations
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const filters = {
    userId: req.query.userId as string,
    itemId: req.query.itemId as string,
    status: req.query.status as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  // Borrowers can only see their own reservations
  if (context.role === 'BORROWER') {
    filters.userId = context.userId;
  }

  const result = await reservationService.getReservations(filters, context);
  res.json(result);
}));

// POST /api/reservations/:id/cancel - Cancel a reservation
router.post('/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  // Get reservation to check ownership
  const reservation = await reservationService.cancelReservation(req.params.id, context);
  res.json(reservation);
}));

// GET /api/reservations/item/:itemId/upcoming - Get upcoming reservations for an item
router.get('/item/:itemId/upcoming', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const reservations = await reservationService.getUpcomingReservations(req.params.itemId, context);
  res.json(reservations);
}));

// GET /api/reservations/item/:itemId/availability - Check item availability
router.get('/item/:itemId/availability', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const { date } = req.query;

  if (!date) {
    throw new AppError('date query parameter is required', 400);
  }

  const isAvailable = await reservationService.checkAvailability(
    req.params.itemId,
    new Date(date as string),
    context
  );

  res.json({ 
    itemId: req.params.itemId,
    date: date,
    isAvailable 
  });
}));

export default router;