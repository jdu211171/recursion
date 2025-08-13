import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { notificationService } from '../services/notificationService';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/notifications - Get notifications for the current user or all (admin)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  const filters = {
    userId: req.query.userId as string || user?.userId,
    type: req.query.type as string,
    isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  // Non-admin users can only see their own notifications
  if (user?.role !== UserRole.ADMIN && filters.userId !== user?.userId) {
    throw new AppError('Unauthorized to view other users notifications', 403);
  }

  const result = await notificationService.getNotifications(filters, context);
  res.json(result);
}));

// GET /api/notifications/unread-count - Get unread notification count for current user
router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  if (!user) {
    throw new AppError('User not found', 401);
  }

  const count = await notificationService.getUnreadCount(user.userId, context);
  res.json({ count });
}));

// GET /api/notifications/:id - Get specific notification
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  const notification = await notificationService.getNotificationById(req.params.id, context);
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Check if user has access to this notification
  if (user?.role !== UserRole.ADMIN && notification.userId !== user?.userId) {
    throw new AppError('Unauthorized to view this notification', 403);
  }

  res.json(notification);
}));

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  const notification = await notificationService.getNotificationById(req.params.id, context);
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Check if user has access to this notification
  if (user?.role !== UserRole.ADMIN && notification.userId !== user?.userId) {
    throw new AppError('Unauthorized to update this notification', 403);
  }

  const updated = await notificationService.markAsRead(req.params.id, context);
  res.json(updated);
}));

// POST /api/notifications/mark-all-read - Mark all notifications as read for current user
router.post('/mark-all-read', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  if (!user) {
    throw new AppError('User not found', 401);
  }

  const result = await notificationService.markAllAsRead(user.userId, context);
  res.json(result);
}));

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const user = req.user;

  const notification = await notificationService.getNotificationById(req.params.id, context);
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Check if user has access to this notification
  if (user?.role !== UserRole.ADMIN && notification.userId !== user?.userId) {
    throw new AppError('Unauthorized to delete this notification', 403);
  }

  const deleted = await notificationService.deleteNotification(req.params.id, context);
  res.json({ message: 'Notification deleted successfully', notification: deleted });
}));

// POST /api/notifications - Create notification (admin only)
router.post('/', requireRole([UserRole.ADMIN]), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const { userId, type, title, message, metadata } = req.body;

  if (!userId || !type || !title || !message) {
    throw new AppError('Missing required fields', 400);
  }

  const notification = await notificationService.createNotification({
    userId,
    type,
    title,
    message,
    metadata
  }, context);

  res.status(201).json(notification);
}));

export default router;