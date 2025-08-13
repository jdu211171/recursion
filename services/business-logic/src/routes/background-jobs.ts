import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getTenantContext } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { jobService } from '../services/jobService';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole([UserRole.ADMIN]));

// GET /api/background-jobs - List background jobs
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const filters = {
    type: req.query.type as string,
    status: req.query.status as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  const result = await jobService.getJobs(filters, context);
  res.json(result);
}));

// GET /api/background-jobs/:id - Get specific job
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const job = await jobService.getJobById(req.params.id, context);
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  res.json(job);
}));

// POST /api/background-jobs/check-overdue - Trigger overdue check
router.post('/check-overdue', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const job = await jobService.createJob({
    type: 'check_overdue',
    payload: req.body
  }, context);

  res.status(201).json({ 
    message: 'Overdue check job created',
    job 
  });
}));

// POST /api/background-jobs/expire-reservations - Expire old reservations
router.post('/expire-reservations', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const job = await jobService.createJob({
    type: 'expire_reservations',
    payload: req.body
  }, context);

  res.status(201).json({ 
    message: 'Expire reservations job created',
    job 
  });
}));

// POST /api/background-jobs/send-reminders - Send due date reminders
router.post('/send-reminders', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const job = await jobService.createJob({
    type: 'send_reminders',
    payload: req.body
  }, context);

  res.status(201).json({ 
    message: 'Send reminders job created',
    job 
  });
}));

// POST /api/background-jobs/process-email-queue - Process email queue
router.post('/process-email-queue', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  const job = await jobService.createJob({
    type: 'process_email_queue',
    payload: req.body
  }, context);

  res.status(201).json({ 
    message: 'Process email queue job created',
    job 
  });
}));

// POST /api/background-jobs/schedule-recurring - Schedule all recurring jobs
router.post('/schedule-recurring', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);

  await jobService.scheduleRecurringJobs(context);

  res.json({ 
    message: 'Recurring jobs scheduled successfully'
  });
}));

// POST /api/background-jobs/process - Manually trigger job processing
router.post('/process', asyncHandler(async (req: Request, res: Response) => {
  const result = await jobService.processPendingJobs();
  
  res.json({ 
    message: 'Job processing completed',
    ...result
  });
}));

// POST /api/background-jobs - Create custom job
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const { type, payload, scheduledFor, maxAttempts } = req.body;

  if (!type) {
    throw new AppError('Job type is required', 400);
  }

  const job = await jobService.createJob({
    type,
    payload,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    maxAttempts
  }, context);

  res.status(201).json(job);
}));

export default router;