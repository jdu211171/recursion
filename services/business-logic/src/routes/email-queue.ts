import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and admin/staff role
router.use(authMiddleware);
router.use(requireRole([UserRole.ADMIN, UserRole.STAFF]));

// GET /api/email-queue - Get email queue
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const filters = {
    status: req.query.status as string,
    to: req.query.to as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  const result = await emailService.getEmailQueue(filters, context);
  res.json(result);
}));

// GET /api/email-queue/:id - Get specific email
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const email = await emailService.getEmailById(req.params.id, context);
  
  if (!email) {
    throw new AppError('Email not found', 404);
  }

  res.json(email);
}));

// POST /api/email-queue - Queue new email
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const { to, subject, body, template, templateData, scheduledFor } = req.body;

  if (!to || !subject) {
    throw new AppError('Missing required fields: to and subject', 400);
  }

  if (!body && !template) {
    throw new AppError('Either body or template must be provided', 400);
  }

  const email = await emailService.queueEmail({
    to,
    subject,
    body,
    template,
    templateData,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
  }, context);

  res.status(201).json(email);
}));

// POST /api/email-queue/:id/retry - Retry failed email
router.post('/:id/retry', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const email = await emailService.retryEmail(req.params.id, context);
  res.json({ message: 'Email queued for retry', email });
}));

// DELETE /api/email-queue/:id - Delete email from queue
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const email = await emailService.deleteEmail(req.params.id, context);
  res.json({ message: 'Email deleted from queue', email });
}));

// POST /api/email-queue/process - Manually trigger email processing (admin only)
router.post('/process', requireRole([UserRole.ADMIN]), asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.processPendingEmails();
  res.json({ 
    message: 'Email processing completed',
    ...result
  });
}));

export default router;