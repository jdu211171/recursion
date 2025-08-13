import { PrismaClient, EmailQueue, Prisma } from '@prisma/client';
import { TenantContext } from '../middleware/tenantContext';

const prisma = new PrismaClient();

export interface EmailFilters {
  status?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface SendEmailData {
  to: string;
  subject: string;
  body?: string;
  template?: string;
  templateData?: any;
  scheduledFor?: Date;
}

class EmailService {
  async queueEmail(data: SendEmailData, context: TenantContext): Promise<EmailQueue> {
    return await prisma.emailQueue.create({
      data: {
        to: data.to,
        subject: data.subject,
        body: data.body || '',
        template: data.template,
        templateData: data.templateData,
        orgId: context.orgId,
        instanceId: context.instanceId,
        scheduledFor: data.scheduledFor || new Date()
      }
    });
  }

  async getEmailQueue(filters: EmailFilters, context: TenantContext) {
    const where: Prisma.EmailQueueWhereInput = {
      orgId: context.orgId,
      instanceId: context.instanceId,
      ...(filters.status && { status: filters.status }),
      ...(filters.to && { to: { contains: filters.to } })
    };

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.emailQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.emailQueue.count({ where })
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getEmailById(id: string, context: TenantContext): Promise<EmailQueue | null> {
    return await prisma.emailQueue.findFirst({
      where: {
        id,
        orgId: context.orgId,
        instanceId: context.instanceId
      }
    });
  }

  async processEmail(id: string): Promise<EmailQueue> {
    const email = await prisma.emailQueue.findUnique({
      where: { id }
    });

    if (!email) {
      throw new Error('Email not found');
    }

    // Increment attempts
    await prisma.emailQueue.update({
      where: { id },
      data: { attempts: email.attempts + 1 }
    });

    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, we'll simulate email sending
      console.log('Sending email:', {
        to: email.to,
        subject: email.subject,
        body: email.body
      });

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as sent
      return await prisma.emailQueue.update({
        where: { id },
        data: {
          status: 'sent',
          sent_at: new Date()
        }
      });
    } catch (error) {
      // Mark as failed
      return await prisma.emailQueue.update({
        where: { id },
        data: {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  async retryEmail(id: string, context: TenantContext): Promise<EmailQueue> {
    const email = await this.getEmailById(id, context);
    if (!email) {
      throw new Error('Email not found');
    }

    if (email.status !== 'failed') {
      throw new Error('Can only retry failed emails');
    }

    // Reset status and schedule for immediate processing
    return await prisma.emailQueue.update({
      where: { id },
      data: {
        status: 'pending',
        scheduled_at: new Date(),
        error_message: null
      }
    });
  }

  async deleteEmail(id: string, context: TenantContext): Promise<EmailQueue> {
    const email = await this.getEmailById(id, context);
    if (!email) {
      throw new Error('Email not found');
    }

    return await prisma.emailQueue.delete({
      where: { id }
    });
  }

  async processPendingEmails(): Promise<{ processed: number; failed: number }> {
    // Get pending emails that are scheduled to be sent
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: 'pending',
        scheduled_at: { lte: new Date() }
      },
      take: 10 // Process 10 at a time
    });

    let processed = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        await this.processEmail(email.id);
        processed++;
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  // Email template methods
  async sendDueReminderEmail(lending: any, context: TenantContext): Promise<EmailQueue> {
    const daysUntilDue = Math.ceil((new Date(lending.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return await this.queueEmail({
      to: lending.borrower.email,
      subject: `Reminder: Item "${lending.item.name}" due in ${daysUntilDue} days`,
      template: 'due_reminder',
      templateData: {
        borrowerName: `${lending.borrower.firstName} ${lending.borrower.lastName}`,
        itemName: lending.item.name,
        dueDate: lending.dueDate,
        daysUntilDue
      }
    }, context);
  }

  async sendOverdueEmail(lending: any, context: TenantContext): Promise<EmailQueue> {
    const daysOverdue = Math.ceil((new Date().getTime() - new Date(lending.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return await this.queueEmail({
      to: lending.borrower.email,
      subject: `Overdue Notice: Please return "${lending.item.name}"`,
      template: 'overdue_notice',
      templateData: {
        borrowerName: `${lending.borrower.firstName} ${lending.borrower.lastName}`,
        itemName: lending.item.name,
        dueDate: lending.dueDate,
        daysOverdue,
        penaltyAmount: daysOverdue * 1.0 // Assuming $1 per day
      }
    }, context);
  }

  async sendReservationConfirmationEmail(reservation: any, context: TenantContext): Promise<EmailQueue> {
    return await this.queueEmail({
      to: reservation.user.email,
      subject: `Reservation Confirmed: ${reservation.item.name}`,
      template: 'reservation_confirmation',
      templateData: {
        userName: `${reservation.user.firstName} ${reservation.user.lastName}`,
        itemName: reservation.item.name,
        startDate: reservation.startDate,
        endDate: reservation.endDate
      }
    }, context);
  }
}

export const emailService = new EmailService();