import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext, itemService } from './itemService';
import itemHistoryService from './itemHistoryService';

const prisma = new PrismaClient();

interface CheckoutData {
  itemId: string;
  borrowerId: string;
  dueDate: Date;
  notes?: string;
  quantity?: number; // Support for borrowing multiple units
}

interface LendingFilters {
  userId?: string;
  itemId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export class LendingService {
  // Default penalty rates (can be overridden per tenant)
  private readonly DEFAULT_LATE_PENALTY_PER_DAY = 1.0;
  private readonly DEFAULT_LOST_ITEM_PENALTY = 50.0;
  private readonly DEFAULT_BLACKLIST_DAYS_PER_LATE_DAY = 3;

  async checkoutItem(data: CheckoutData, context: TenantContext) {
    const { itemId, borrowerId, dueDate, notes, quantity = 1 } = data;

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    // Check if user is blacklisted
    const activeBlacklist = await prisma.blacklist.findFirst({
      where: {
        userId: borrowerId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        isActive: true,
        blockedUntil: { gte: new Date() }
      }
    });

    if (activeBlacklist) {
      throw new AppError('User is currently blacklisted', 403);
    }

    // Create lending record using transaction
    const lending = await prisma.$transaction(async (tx) => {
      // Check if item exists and has enough available count
      const item = await tx.item.findFirst({
        where: {
          id: itemId,
          orgId: context.orgId,
          ...(context.instanceId && { instanceId: context.instanceId })
        }
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      if (item.availableCount < quantity) {
        throw new AppError(`Not enough items available. Available: ${item.availableCount}, Requested: ${quantity}`, 400);
      }

      // Check if item has an active reservation by another user
      const activeReservation = await tx.reservation.findFirst({
        where: {
          itemId,
          status: 'ACTIVE',
          userId: { not: borrowerId },
          reservedFor: { lte: new Date() },
          expiresAt: { gte: new Date() }
        }
      });

      if (activeReservation) {
        throw new AppError('Item is reserved by another user', 409);
      }

      // Create lending record
      const newLending = await tx.lending.create({
        data: {
          itemId,
          userId: borrowerId,
          orgId: context.orgId,
          instanceId: context.instanceId,
          dueDate,
          notes,
          // Store quantity in metadata for future reference
          metadata: { quantity }
        },
        include: {
          item: true,
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

      // Decrement available count
      await tx.item.update({
        where: { id: itemId },
        data: {
          availableCount: {
            decrement: quantity
          }
        }
      });

      // Fulfill any reservation by this user
      await tx.reservation.updateMany({
        where: {
          itemId,
          userId: borrowerId,
          status: 'ACTIVE'
        },
        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date()
        }
      });

      return newLending;
    });

    // Log item borrowing
    try {
      await itemHistoryService.logItemBorrowing(itemId, borrowerId, {
        dueDate: dueDate.toISOString(),
        quantity: quantity,
        notes: notes,
        lendingId: lending.id
      }, { orgId: context.orgId, instanceId: context.instanceId });
    } catch (error) {
      console.error('Failed to log item borrowing:', error);
      // Don't fail the operation if logging fails
    }

    return lending;
  }

  async returnItem(lendingId: string, context: TenantContext) {
    // Find lending record
    const lending = await prisma.lending.findFirst({
      where: {
        id: lendingId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        returnedAt: null
      },
      include: {
        item: true,
        user: true
      }
    });

    if (!lending) {
      throw new AppError('Active lending not found', 404);
    }

    const returnDate = new Date();
    const daysLate = Math.max(0, Math.floor((returnDate.getTime() - lending.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let penalty = 0;
    let penaltyReason = null;
    let blacklistUntil = null;

    // Calculate penalties if late
    if (daysLate > 0) {
      penalty = daysLate * this.DEFAULT_LATE_PENALTY_PER_DAY;
      penaltyReason = `Late return: ${daysLate} days`;
      
      // Calculate blacklist duration
      const blacklistDays = daysLate * this.DEFAULT_BLACKLIST_DAYS_PER_LATE_DAY;
      blacklistUntil = new Date();
      blacklistUntil.setDate(blacklistUntil.getDate() + blacklistDays);
    }

    // Extract quantity from metadata (default to 1 for backward compatibility)
    const metadata = lending.metadata as any;
    const quantity = metadata?.quantity || 1;

    // Update lending and item using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update lending record
      const updatedLending = await tx.lending.update({
        where: { id: lendingId },
        data: {
          returnedAt: returnDate,
          penalty,
          penaltyReason
        }
      });

      // Increment available count
      await tx.item.update({
        where: { id: lending.itemId },
        data: {
          availableCount: {
            increment: quantity
          }
        }
      });

      // Apply blacklist if needed
      if (blacklistUntil) {
        await tx.blacklist.create({
          data: {
            userId: lending.userId,
            orgId: context.orgId,
            instanceId: context.instanceId,
            reason: `Automatic blacklist: ${penaltyReason}`,
            blockedUntil: blacklistUntil
          }
        });
      }

      return updatedLending;
    });

    // Log item return
    try {
      await itemHistoryService.logItemReturn(lending.itemId, lending.userId, {
        returnedAt: returnDate.toISOString(),
        penalty: penalty,
        penaltyReason: penaltyReason,
        daysLate: daysLate,
        quantity: quantity,
        lendingId: lending.id
      }, { orgId: context.orgId, instanceId: context.instanceId });
    } catch (error) {
      console.error('Failed to log item return:', error);
      // Don't fail the operation if logging fails
    }

    return result;
  }

  async getLendingHistory(filters: LendingFilters, context: TenantContext) {
    const { userId, itemId, isActive, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.LendingWhereInput = {
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId }),
      ...(userId && { userId }),
      ...(itemId && { itemId }),
      ...(typeof isActive === 'boolean' && {
        returnedAt: isActive ? null : { not: null }
      })
    };

    const [lendings, total] = await Promise.all([
      prisma.lending.findMany({
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
        orderBy: { borrowedAt: 'desc' }
      }),
      prisma.lending.count({ where })
    ]);

    return {
      lendings: lendings.map(lending => ({
        ...lending,
        quantity: (lending.metadata as any)?.quantity || 1
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async calculatePenalty(lendingId: string, context: TenantContext) {
    const lending = await prisma.lending.findFirst({
      where: {
        id: lendingId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!lending) {
      throw new AppError('Lending not found', 404);
    }

    if (lending.returnedAt) {
      return {
        penalty: lending.penalty,
        reason: lending.penaltyReason,
        isOverridden: lending.penaltyOverride
      };
    }

    // Calculate current penalty for unreturned item
    const currentDate = new Date();
    const daysLate = Math.max(0, Math.floor((currentDate.getTime() - lending.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      penalty: daysLate * this.DEFAULT_LATE_PENALTY_PER_DAY,
      reason: daysLate > 0 ? `Currently ${daysLate} days late` : 'Not yet due',
      isOverridden: false
    };
  }

  async applyBlacklist(userId: string, reason: string, daysBlocked: number, context: TenantContext) {
    // Check if user exists in this tenant
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + daysBlocked);

    const blacklist = await prisma.blacklist.create({
      data: {
        userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        reason,
        blockedUntil
      }
    });

    return blacklist;
  }

  async overridePenalty(lendingId: string, newPenalty: number, reason: string, context: TenantContext) {
    const lending = await prisma.lending.findFirst({
      where: {
        id: lendingId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!lending) {
      throw new AppError('Lending not found', 404);
    }

    if (!lending.returnedAt) {
      throw new AppError('Cannot override penalty for unreturned item', 400);
    }

    const updated = await prisma.lending.update({
      where: { id: lendingId },
      data: {
        penalty: newPenalty,
        penaltyReason: reason,
        penaltyOverride: true
      }
    });

    return updated;
  }

  async removeBlacklist(blacklistId: string, context: TenantContext) {
    const blacklist = await prisma.blacklist.findFirst({
      where: {
        id: blacklistId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!blacklist) {
      throw new AppError('Blacklist entry not found', 404);
    }

    const updated = await prisma.blacklist.update({
      where: { id: blacklistId },
      data: {
        isActive: false,
        overriddenBy: context.userId,
        overriddenAt: new Date()
      }
    });

    return updated;
  }

  // Helper method to check overdue items and apply automatic blacklists
  async processOverdueItems(context: TenantContext) {
    const overdueItems = await prisma.lending.findMany({
      where: {
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId }),
        returnedAt: null,
        dueDate: { lt: new Date() }
      },
      include: {
        user: true,
        item: true
      }
    });

    const blacklistPromises = overdueItems.map(async (lending) => {
      // Check if user is already blacklisted for this item
      const existingBlacklist = await prisma.blacklist.findFirst({
        where: {
          userId: lending.userId,
          orgId: context.orgId,
          ...(context.instanceId && { instanceId: context.instanceId }),
          isActive: true,
          reason: { contains: `Overdue: ${lending.item.name}` }
        }
      });

      if (!existingBlacklist) {
        const daysLate = Math.floor((new Date().getTime() - lending.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const blacklistDays = daysLate * this.DEFAULT_BLACKLIST_DAYS_PER_LATE_DAY;
        
        const blockedUntil = new Date();
        blockedUntil.setDate(blockedUntil.getDate() + blacklistDays);

        return prisma.blacklist.create({
          data: {
            userId: lending.userId,
            orgId: context.orgId,
            instanceId: context.instanceId,
            reason: `Overdue: ${lending.item.name} (${daysLate} days late)`,
            blockedUntil
          }
        });
      }
    });

    await Promise.all(blacklistPromises.filter(Boolean));
  }
}

export const lendingService = new LendingService();