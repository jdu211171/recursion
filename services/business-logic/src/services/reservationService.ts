import { PrismaClient, Prisma, ReservationStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from './itemService';

const prisma = new PrismaClient();

interface CreateReservationData {
  itemId: string;
  userId: string;
  reservedFor: Date;
  notes?: string;
  quantity?: number; // Support for reserving multiple units
}

interface ReservationFilters {
  userId?: string;
  itemId?: string;
  status?: string;
  page: number;
  limit: number;
}

export class ReservationService {
  // Default reservation hold time (in hours)
  private readonly DEFAULT_RESERVATION_HOLD_HOURS = 24;

  async createReservation(data: CreateReservationData, context: TenantContext) {
    const { itemId, userId, reservedFor, notes, quantity = 1 } = data;

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    // Check if user is blacklisted
    const activeBlacklist = await prisma.blacklist.findFirst({
      where: {
        userId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        isActive: true,
        blockedUntil: { gte: new Date() }
      }
    });

    if (activeBlacklist) {
      throw new AppError('User is currently blacklisted', 403);
    }

    // Verify item exists in tenant
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Check if user already has an active reservation for this item
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        itemId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (existingReservation) {
      throw new AppError('User already has an active reservation for this item', 409);
    }

    // Check availability for the requested date and quantity
    const availableQuantity = await this.getAvailableQuantity(itemId, reservedFor, context);
    if (availableQuantity < quantity) {
      throw new AppError(`Not enough items available for reservation. Available: ${availableQuantity}, Requested: ${quantity}`, 409);
    }

    // Calculate expiration time
    const expiresAt = new Date(reservedFor);
    expiresAt.setHours(expiresAt.getHours() + this.DEFAULT_RESERVATION_HOLD_HOURS);

    // Create reservation using transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Create reservation with quantity in metadata
      const newReservation = await tx.reservation.create({
        data: {
          itemId,
          userId,
          orgId: context.orgId,
          instanceId: context.instanceId,
          reservedFor,
          expiresAt,
          notes,
          metadata: { quantity }
        },
        include: {
          item: {
            select: {
              id: true,
              uniqueId: true,
              name: true,
              totalCount: true,
              availableCount: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              contactInfo: true
            }
          }
        }
      });

      // For reservations starting immediately, temporarily reduce available count
      if (reservedFor <= new Date()) {
        await tx.item.update({
          where: { id: itemId },
          data: {
            availableCount: {
              decrement: quantity
            }
          }
        });
      }

      return newReservation;
    });

    return {
      ...reservation,
      quantity: (reservation.metadata as any)?.quantity || 1
    };
  }

  async getReservations(filters: ReservationFilters, context: TenantContext) {
    const { userId, itemId, status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId }),
      ...(userId && { userId }),
      ...(itemId && { itemId }),
      ...(status && { status: status as ReservationStatus })
    };

    // Auto-expire old reservations using transaction
    await prisma.$transaction(async (tx) => {
      // Find active reservations that need to expire
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: new Date() }
        }
      });

      // Update their status
      await tx.reservation.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: new Date() }
        },
        data: { status: 'EXPIRED' }
      });

      // Restore available counts for immediate reservations that expired
      for (const reservation of expiredReservations) {
        if (reservation.reservedFor <= new Date()) {
          const metadata = reservation.metadata as any;
          const quantity = metadata?.quantity || 1;
          
          await tx.item.update({
            where: { id: reservation.itemId },
            data: {
              availableCount: {
                increment: quantity
              }
            }
          });
        }
      }
    });

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          item: {
            select: {
              id: true,
              uniqueId: true,
              name: true,
              totalCount: true,
              availableCount: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              contactInfo: true
            }
          }
        },
        orderBy: { reservedFor: 'asc' }
      }),
      prisma.reservation.count({ where })
    ]);

    return {
      reservations: reservations.map(reservation => ({
        ...reservation,
        quantity: (reservation.metadata as any)?.quantity || 1
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async cancelReservation(reservationId: string, context: TenantContext) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        status: 'ACTIVE'
      }
    });

    if (!reservation) {
      throw new AppError('Active reservation not found', 404);
    }

    // Cancel using transaction
    const updated = await prisma.$transaction(async (tx) => {
      const cancelledReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      // If reservation was for immediate use, restore available count
      if (reservation.reservedFor <= new Date()) {
        const metadata = reservation.metadata as any;
        const quantity = metadata?.quantity || 1;
        
        await tx.item.update({
          where: { id: reservation.itemId },
          data: {
            availableCount: {
              increment: quantity
            }
          }
        });
      }

      return cancelledReservation;
    });

    return updated;
  }

  // Check availability considering counts
  async checkAvailability(itemId: string, date: Date, context: TenantContext): Promise<boolean> {
    const availableQuantity = await this.getAvailableQuantity(itemId, date, context);
    return availableQuantity > 0;
  }

  // Get available quantity for a specific date
  async getAvailableQuantity(itemId: string, date: Date, context: TenantContext): Promise<number> {
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!item) {
      return 0;
    }

    // Start with current available count
    let availableQuantity = item.availableCount;

    // Get all active lendings that will still be out on the requested date
    const activeLendings = await prisma.lending.findMany({
      where: {
        itemId,
        returnedAt: null,
        dueDate: { gte: date }
      }
    });

    // Subtract quantities from active lendings
    for (const lending of activeLendings) {
      const metadata = lending.metadata as any;
      const quantity = metadata?.quantity || 1;
      availableQuantity -= quantity;
    }

    // Get conflicting active reservations
    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        itemId,
        status: 'ACTIVE',
        reservedFor: { lte: date },
        expiresAt: { gte: date }
      }
    });

    // Subtract quantities from active reservations
    for (const reservation of conflictingReservations) {
      const metadata = reservation.metadata as any;
      const quantity = metadata?.quantity || 1;
      availableQuantity -= quantity;
    }

    // For future dates, add back currently borrowed items that will be returned by then
    if (date > new Date()) {
      const itemsToBeReturned = await prisma.lending.findMany({
        where: {
          itemId,
          returnedAt: null,
          dueDate: { lt: date }
        }
      });

      for (const lending of itemsToBeReturned) {
        const metadata = lending.metadata as any;
        const quantity = metadata?.quantity || 1;
        availableQuantity += quantity;
      }
    }

    return Math.max(0, availableQuantity);
  }

  async fulfillReservation(reservationId: string, context: TenantContext) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        status: 'ACTIVE'
      }
    });

    if (!reservation) {
      throw new AppError('Active reservation not found', 404);
    }

    // This will be called automatically when checkout happens
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'FULFILLED',
        fulfilledAt: new Date()
      }
    });

    return updated;
  }

  async getUpcomingReservations(itemId: string, context: TenantContext) {
    const reservations = await prisma.reservation.findMany({
      where: {
        itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        status: 'ACTIVE',
        reservedFor: { gte: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            contactInfo: true
          }
        }
      },
      orderBy: { reservedFor: 'asc' }
    });

    return reservations.map(reservation => ({
      ...reservation,
      quantity: (reservation.metadata as any)?.quantity || 1
    }));
  }
}

export const reservationService = new ReservationService();