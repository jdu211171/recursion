import { PrismaClient, SystemNotification, Prisma } from '@prisma/client';
import { TenantContext } from '../middleware/tenantContext';

const prisma = new PrismaClient();

export interface NotificationFilters {
  userId?: string;
  type?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

class NotificationService {
  async createNotification(data: CreateNotificationData, context: TenantContext): Promise<SystemNotification> {
    return await prisma.systemNotification.create({
      data: {
        userId: data.userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata
      }
    });
  }

  async getNotifications(filters: NotificationFilters, context: TenantContext) {
    const where: Prisma.SystemNotificationWhereInput = {
      orgId: context.orgId,
      instanceId: context.instanceId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.isRead !== undefined && { isRead: filters.isRead })
    };

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.systemNotification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.systemNotification.count({ where })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getNotificationById(id: string, context: TenantContext): Promise<SystemNotification | null> {
    return await prisma.systemNotification.findFirst({
      where: {
        id,
        orgId: context.orgId,
        instanceId: context.instanceId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async markAsRead(id: string, context: TenantContext): Promise<SystemNotification> {
    const notification = await this.getNotificationById(id, context);
    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.systemNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async markAllAsRead(userId: string, context: TenantContext): Promise<{ count: number }> {
    const result = await prisma.systemNotification.updateMany({
      where: {
        userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { count: result.count };
  }

  async deleteNotification(id: string, context: TenantContext): Promise<SystemNotification> {
    const notification = await this.getNotificationById(id, context);
    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.systemNotification.delete({
      where: { id }
    });
  }

  async getUnreadCount(userId: string, context: TenantContext): Promise<number> {
    return await prisma.systemNotification.count({
      where: {
        userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        isRead: false
      }
    });
  }

  // Helper method to create common notification types
  async createDueReminder(lendingId: string, context: TenantContext): Promise<SystemNotification> {
    const lending = await prisma.lending.findUnique({
      where: { id: lendingId },
      include: {
        borrower: true,
        item: true
      }
    });

    if (!lending) {
      throw new Error('Lending not found');
    }

    const daysUntilDue = Math.ceil((lending.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return await this.createNotification({
      userId: lending.borrowerId,
      type: 'due_reminder',
      title: 'Item Due Soon',
      message: `Your borrowed item "${lending.item.name}" is due in ${daysUntilDue} days.`,
      metadata: {
        lendingId: lending.id,
        itemId: lending.itemId,
        dueDate: lending.dueDate
      }
    }, context);
  }

  async createOverdueNotification(lendingId: string, context: TenantContext): Promise<SystemNotification> {
    const lending = await prisma.lending.findUnique({
      where: { id: lendingId },
      include: {
        borrower: true,
        item: true
      }
    });

    if (!lending) {
      throw new Error('Lending not found');
    }

    const daysOverdue = Math.ceil((new Date().getTime() - lending.dueDate.getTime()) / (1000 * 60 * 60 * 24));

    return await this.createNotification({
      userId: lending.borrowerId,
      type: 'overdue',
      title: 'Item Overdue',
      message: `Your borrowed item "${lending.item.name}" is ${daysOverdue} days overdue. Please return it immediately.`,
      metadata: {
        lendingId: lending.id,
        itemId: lending.itemId,
        dueDate: lending.dueDate,
        daysOverdue
      }
    }, context);
  }

  async createReservationReadyNotification(reservationId: string, context: TenantContext): Promise<SystemNotification> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
        item: true
      }
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return await this.createNotification({
      userId: reservation.userId,
      type: 'reservation_ready',
      title: 'Reservation Ready',
      message: `Your reserved item "${reservation.item.name}" is now available for pickup.`,
      metadata: {
        reservationId: reservation.id,
        itemId: reservation.itemId,
        startDate: reservation.startDate
      }
    }, context);
  }
}

export const notificationService = new NotificationService();