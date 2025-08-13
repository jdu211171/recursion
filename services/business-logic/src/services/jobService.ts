import { PrismaClient, BackgroundJob, Prisma } from '@prisma/client';
import { TenantContext } from '../middleware/tenantContext';
import { notificationService } from './notificationService';
import { emailService } from './emailService';
import { lendingService } from './lendingService';
import { reservationService } from './reservationService';

const prisma = new PrismaClient();

export interface JobFilters {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateJobData {
  type: string;
  payload?: any;
  scheduledFor?: Date;
  maxAttempts?: number;
}

class JobService {
  async createJob(data: CreateJobData, context: TenantContext): Promise<BackgroundJob> {
    return await prisma.backgroundJob.create({
      data: {
        type: data.type,
        payload: data.payload,
        orgId: context.orgId,
        scheduledFor: data.scheduledFor || new Date(),
        maxAttempts: data.maxAttempts || 3
      }
    });
  }

  async getJobs(filters: JobFilters, context: TenantContext) {
    const where: Prisma.BackgroundJobWhereInput = {
      orgId: context.orgId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status })
    };

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.backgroundJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.backgroundJob.count({ where })
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getJobById(id: string, context: TenantContext): Promise<BackgroundJob | null> {
    return await prisma.backgroundJob.findFirst({
      where: {
        id,
        orgId: context.orgId
      }
    });
  }

  async processJob(job: BackgroundJob): Promise<BackgroundJob> {
    // Mark job as running
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        attempts: job.attempts + 1
      }
    });

    try {
      const context: TenantContext = {
        orgId: job.orgId,
        instanceId: null,
        user: null
      };

      let result: any;

      switch (job.type) {
        case 'check_overdue':
          result = await this.checkOverdueItems(context);
          break;
        case 'expire_reservations':
          result = await this.expireReservations(context);
          break;
        case 'send_reminders':
          result = await this.sendDueReminders(context);
          break;
        case 'process_email_queue':
          result = await emailService.processPendingEmails();
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      return await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result
        }
      });
    } catch (error) {
      // Check if we should retry
      const shouldRetry = job.attempts < job.maxAttempts;
      
      return await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          failedAt: shouldRetry ? null : new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          // Schedule retry in 5 minutes
          scheduledFor: shouldRetry ? new Date(Date.now() + 5 * 60 * 1000) : job.scheduledFor
        }
      });
    }
  }

  async processPendingJobs(): Promise<{ processed: number; failed: number }> {
    // Get pending jobs that are scheduled to run
    const pendingJobs = await prisma.backgroundJob.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() }
      },
      take: 5 // Process 5 at a time
    });

    let processed = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      try {
        await this.processJob(job);
        processed++;
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  // Job implementations
  private async checkOverdueItems(context: TenantContext): Promise<any> {
    const overdueLendings = await prisma.lending.findMany({
      where: {
        orgId: context.orgId,
        status: 'ACTIVE',
        dueDate: { lt: new Date() }
      },
      include: {
        borrower: true,
        item: true
      }
    });

    let notificationsSent = 0;
    let emailsQueued = 0;

    for (const lending of overdueLendings) {
      try {
        // Create notification
        await notificationService.createOverdueNotification(lending.id, context);
        notificationsSent++;

        // Queue email
        await emailService.sendOverdueEmail(lending, context);
        emailsQueued++;
      } catch (error) {
        console.error(`Failed to process overdue lending ${lending.id}:`, error);
      }
    }

    return {
      overdueCount: overdueLendings.length,
      notificationsSent,
      emailsQueued
    };
  }

  private async expireReservations(context: TenantContext): Promise<any> {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        orgId: context.orgId,
        status: 'ACTIVE',
        endDate: { lt: new Date() }
      }
    });

    let expiredCount = 0;

    for (const reservation of expiredReservations) {
      try {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'EXPIRED',
            cancelledAt: new Date()
          }
        });
        expiredCount++;
      } catch (error) {
        console.error(`Failed to expire reservation ${reservation.id}:`, error);
      }
    }

    return {
      expiredCount,
      processedAt: new Date()
    };
  }

  private async sendDueReminders(context: TenantContext): Promise<any> {
    // Find lendings due in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingDueLendings = await prisma.lending.findMany({
      where: {
        orgId: context.orgId,
        status: 'ACTIVE',
        dueDate: {
          gte: new Date(),
          lte: threeDaysFromNow
        }
      },
      include: {
        borrower: true,
        item: true
      }
    });

    let notificationsSent = 0;
    let emailsQueued = 0;

    for (const lending of upcomingDueLendings) {
      try {
        // Check if reminder was already sent today
        const existingNotification = await prisma.systemNotification.findFirst({
          where: {
            userId: lending.borrowerId,
            type: 'due_reminder',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            },
            metadata: {
              path: ['lendingId'],
              equals: lending.id
            }
          }
        });

        if (!existingNotification) {
          // Create notification
          await notificationService.createDueReminder(lending.id, context);
          notificationsSent++;

          // Queue email
          await emailService.sendDueReminderEmail(lending, context);
          emailsQueued++;
        }
      } catch (error) {
        console.error(`Failed to send reminder for lending ${lending.id}:`, error);
      }
    }

    return {
      upcomingDueCount: upcomingDueLendings.length,
      notificationsSent,
      emailsQueued
    };
  }

  // Schedule recurring jobs
  async scheduleRecurringJobs(context: TenantContext): Promise<void> {
    const jobs = [
      { type: 'check_overdue', interval: 60 * 60 * 1000 }, // Every hour
      { type: 'expire_reservations', interval: 60 * 60 * 1000 }, // Every hour
      { type: 'send_reminders', interval: 24 * 60 * 60 * 1000 }, // Daily
      { type: 'process_email_queue', interval: 5 * 60 * 1000 } // Every 5 minutes
    ];

    for (const job of jobs) {
      // Check if job already exists for today
      const existingJob = await prisma.backgroundJob.findFirst({
        where: {
          orgId: context.orgId,
          type: job.type,
          status: { in: ['pending', 'running'] },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      if (!existingJob) {
        await this.createJob({
          type: job.type,
          scheduledFor: new Date()
        }, context);
      }
    }
  }
}

export const jobService = new JobService();