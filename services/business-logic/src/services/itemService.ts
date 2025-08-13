import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { randomBytes } from 'crypto';
import itemHistoryService from './itemHistoryService';

const prisma = new PrismaClient();

export interface TenantContext {
  orgId: number;
  instanceId?: number;
  userId: string;
  role: string;
}

interface ItemFilters {
  search?: string;
  categoryId?: string;
  isAvailable?: boolean;
  page: number;
  limit: number;
}

interface CreateItemData {
  name: string;
  description?: string;
  categoryId?: string;
  uniqueId?: string; // Optional custom unique ID (barcode, ISBN, etc.)
  totalCount?: number; // Total quantity of the item
  metadata?: any;
}

interface UpdateItemData {
  name?: string;
  description?: string;
  categoryId?: string;
  totalCount?: number; // Can update total quantity
  availableCount?: number; // Can manually adjust available count if needed
  metadata?: any;
}

export class ItemService {
  // Generate unique ID with prefix
  private generateUniqueId(prefix: string = 'ITM'): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  async createItem(data: CreateItemData, context: TenantContext) {
    const { name, description, categoryId, uniqueId, totalCount = 1, metadata } = data;

    if (!name) {
      throw new AppError('Item name is required', 400);
    }

    if (totalCount < 1) {
      throw new AppError('Total count must be at least 1', 400);
    }

    // Verify category belongs to tenant if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          orgId: context.orgId,
          ...(context.instanceId && { instanceId: context.instanceId })
        }
      });

      if (!category) {
        throw new AppError('Invalid category', 400);
      }
    }

    // Create item with aggregate counts
    const item = await prisma.item.create({
      data: {
        uniqueId: uniqueId || this.generateUniqueId(),
        name,
        description,
        categoryId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        totalCount,
        availableCount: totalCount, // Initially all items are available
        metadata
      },
      include: {
        category: true
      }
    });

    // Log item creation
    try {
      await itemHistoryService.logItemCreation(item.id, context.userId, {
        name: item.name,
        uniqueId: item.uniqueId,
        totalCount: item.totalCount,
        category: item.category?.name
      }, { orgId: context.orgId, instanceId: context.instanceId });
    } catch (error) {
      console.error('Failed to log item creation:', error);
      // Don't fail the operation if logging fails
    }

    return item;
  }

  async getItems(filters: ItemFilters, context: TenantContext) {
    const { search, categoryId, isAvailable, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ItemWhereInput = {
      orgId: context.orgId,
      ...(context.instanceId !== undefined && { instanceId: context.instanceId }),
      ...(categoryId && { categoryId }),
      ...(isAvailable !== undefined && {
        availableCount: isAvailable ? { gt: 0 } : 0
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { uniqueId: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          _count: {
            select: {
              lendings: {
                where: { returnedAt: null }
              },
              reservations: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.item.count({ where })
    ]);

    return {
      items: items.map(item => ({
        ...item,
        borrowedCount: item.totalCount - item.availableCount,
        activeReservations: item._count.reservations
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getItemById(id: string, context: TenantContext) {
    const item = await prisma.item.findFirst({
      where: {
        id,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      },
      include: {
        category: true,
        _count: {
          select: {
            lendings: {
              where: { returnedAt: null }
            },
            reservations: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    return {
      ...item,
      borrowedCount: item.totalCount - item.availableCount,
      activeReservations: item._count.reservations
    };
  }

  async updateItem(id: string, data: UpdateItemData, context: TenantContext) {
    const { name, description, categoryId, totalCount, availableCount, metadata } = data;

    // Verify item belongs to tenant
    const existing = await prisma.item.findFirst({
      where: {
        id,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!existing) {
      throw new AppError('Item not found', 404);
    }

    // Verify new category if provided
    if (categoryId !== undefined && categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          orgId: context.orgId,
          ...(context.instanceId && { instanceId: context.instanceId })
        }
      });

      if (!category) {
        throw new AppError('Invalid category', 400);
      }
    }

    // Validate count updates
    if (totalCount !== undefined) {
      if (totalCount < 1) {
        throw new AppError('Total count must be at least 1', 400);
      }
      
      // Calculate current borrowed count
      const borrowedCount = existing.totalCount - existing.availableCount;
      if (totalCount < borrowedCount) {
        throw new AppError(`Cannot set total count below current borrowed count (${borrowedCount})`, 400);
      }
    }

    if (availableCount !== undefined) {
      if (availableCount < 0) {
        throw new AppError('Available count cannot be negative', 400);
      }
      
      const newTotalCount = totalCount !== undefined ? totalCount : existing.totalCount;
      if (availableCount > newTotalCount) {
        throw new AppError('Available count cannot exceed total count', 400);
      }
    }

    // Update item
    const updateData: Prisma.ItemUpdateInput = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(categoryId !== undefined && { categoryId }),
      ...(metadata !== undefined && { metadata })
    };

    // Update counts if provided
    if (totalCount !== undefined) {
      updateData.totalCount = totalCount;
      // Adjust available count proportionally if total count changes
      if (availableCount === undefined) {
        const borrowedCount = existing.totalCount - existing.availableCount;
        updateData.availableCount = totalCount - borrowedCount;
      }
    }

    if (availableCount !== undefined) {
      updateData.availableCount = availableCount;
    }

    const updated = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    // Log item update
    try {
      const changes: Record<string, { old: any, new: any }> = {};
      
      if (name !== undefined && name !== existing.name) {
        changes.name = { old: existing.name, new: name };
      }
      if (description !== undefined && description !== existing.description) {
        changes.description = { old: existing.description, new: description };
      }
      if (categoryId !== undefined && categoryId !== existing.categoryId) {
        changes.categoryId = { old: existing.categoryId, new: categoryId };
      }
      if (totalCount !== undefined && totalCount !== existing.totalCount) {
        changes.totalCount = { old: existing.totalCount, new: totalCount };
      }
      if (availableCount !== undefined && availableCount !== existing.availableCount) {
        changes.availableCount = { old: existing.availableCount, new: availableCount };
      }

      if (Object.keys(changes).length > 0) {
        await itemHistoryService.logItemUpdate(id, context.userId, changes, { 
          orgId: context.orgId, 
          instanceId: context.instanceId 
        });
      }
    } catch (error) {
      console.error('Failed to log item update:', error);
      // Don't fail the operation if logging fails
    }

    return updated;
  }

  async deleteItem(id: string, context: TenantContext) {
    // Verify item belongs to tenant
    const item = await prisma.item.findFirst({
      where: {
        id,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      },
      include: {
        _count: {
          select: {
            lendings: {
              where: { returnedAt: null }
            },
            reservations: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Don't allow deletion if item has active lendings
    if (item._count.lendings > 0) {
      throw new AppError('Cannot delete item with active lendings', 400);
    }

    // Don't allow deletion if item has active reservations
    if (item._count.reservations > 0) {
      throw new AppError('Cannot delete item with active reservations', 400);
    }

    await prisma.item.delete({
      where: { id }
    });

    // Log item deletion
    try {
      await itemHistoryService.createHistoryEntry({
        itemId: id,
        userId: context.userId,
        action: 'deleted',
        metadata: {
          name: item.name,
          uniqueId: item.uniqueId,
          deletedAt: new Date().toISOString()
        }
      }, { orgId: context.orgId, instanceId: context.instanceId });
    } catch (error) {
      console.error('Failed to log item deletion:', error);
      // Don't fail the operation if logging fails
    }
  }

  // Helper method to check if an item can be borrowed
  async canBorrow(itemId: string, quantity: number = 1): Promise<boolean> {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return false;
    }

    return item.availableCount >= quantity;
  }

  // Helper method to update available count (used by lending service)
  async updateAvailableCount(itemId: string, delta: number) {
    const item = await prisma.item.update({
      where: { id: itemId },
      data: {
        availableCount: {
          increment: delta
        }
      }
    });

    // Validate the update didn't violate constraints
    if (item.availableCount < 0 || item.availableCount > item.totalCount) {
      throw new AppError('Invalid count update operation', 500);
    }

    return item;
  }
}

export const itemService = new ItemService();