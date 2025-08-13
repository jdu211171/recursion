import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TenantContext {
  orgId: number
  instanceId?: number
}

interface CreateHistoryEntry {
  itemId: string
  userId: string
  action: 'created' | 'updated' | 'borrowed' | 'returned' | 'deleted' | 'reserved' | 'cancelled' | 'approved' | 'rejected' | 'availability_changed'
  changes?: Record<string, { old: any, new: any }>
  metadata?: Record<string, any>
}

interface HistoryFilters {
  action?: string
  userId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class ItemHistoryService {
  // Create a new history entry
  async createHistoryEntry(data: CreateHistoryEntry, context: TenantContext) {
    // Verify the item belongs to the organization
    const item = await prisma.item.findFirst({
      where: {
        id: data.itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    })

    if (!item) {
      throw new Error('Item not found or access denied')
    }

    return await prisma.itemHistory.create({
      data: {
        itemId: data.itemId,
        userId: data.userId,
        action: data.action,
        changes: data.changes || null,
        metadata: data.metadata || null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true
          }
        }
      }
    })
  }

  // Get history for a specific item
  async getItemHistory(itemId: string, context: TenantContext, filters: HistoryFilters = {}) {
    // Verify the item belongs to the organization
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    })

    if (!item) {
      throw new Error('Item not found or access denied')
    }

    const where: any = {
      itemId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    return await prisma.itemHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 50,
      skip: filters.offset || 0
    })
  }

  // Get organization-wide item history (admin view)
  async getOrganizationHistory(context: TenantContext, filters: HistoryFilters = {}) {
    const where: any = {
      item: {
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    return await prisma.itemHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 100,
      skip: filters.offset || 0
    })
  }

  // Get history statistics
  async getHistoryStats(context: TenantContext, timeRange?: { start: Date, end: Date }) {
    const where: any = {
      item: {
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    }

    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end
      }
    }

    const [
      totalActions,
      actionBreakdown,
      mostActiveItems,
      mostActiveUsers
    ] = await Promise.all([
      // Total number of actions
      prisma.itemHistory.count({ where }),
      
      // Actions by type
      prisma.itemHistory.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),

      // Most active items (by history count)
      prisma.itemHistory.groupBy({
        by: ['itemId'],
        where,
        _count: { itemId: true },
        orderBy: { _count: { itemId: 'desc' } },
        take: 10
      }).then(async (results) => {
        const itemIds = results.map(r => r.itemId)
        const items = await prisma.item.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, name: true, uniqueId: true }
        })
        
        return results.map(result => ({
          item: items.find(item => item.id === result.itemId),
          actionCount: result._count.itemId
        }))
      }),

      // Most active users
      prisma.itemHistory.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      }).then(async (results) => {
        const userIds = results.map(r => r.userId)
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, firstName: true, lastName: true }
        })
        
        return results.map(result => ({
          user: users.find(user => user.id === result.userId),
          actionCount: result._count.userId
        }))
      })
    ])

    return {
      totalActions,
      actionBreakdown,
      mostActiveItems,
      mostActiveUsers
    }
  }

  // Helper method to log item creation
  async logItemCreation(itemId: string, userId: string, itemData: any, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'created',
      metadata: {
        name: itemData.name,
        uniqueId: itemData.uniqueId,
        totalCount: itemData.totalCount,
        category: itemData.category
      }
    }, context)
  }

  // Helper method to log item updates
  async logItemUpdate(itemId: string, userId: string, changes: Record<string, { old: any, new: any }>, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'updated',
      changes,
      metadata: {
        fieldsChanged: Object.keys(changes)
      }
    }, context)
  }

  // Helper method to log borrowing
  async logItemBorrowing(itemId: string, userId: string, lendingData: any, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'borrowed',
      metadata: {
        dueDate: lendingData.dueDate,
        quantity: lendingData.quantity || 1,
        notes: lendingData.notes
      }
    }, context)
  }

  // Helper method to log returning
  async logItemReturn(itemId: string, userId: string, returnData: any, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'returned',
      metadata: {
        returnedAt: returnData.returnedAt,
        penalty: returnData.penalty,
        notes: returnData.notes,
        condition: returnData.condition
      }
    }, context)
  }

  // Helper method to log reservations
  async logItemReservation(itemId: string, userId: string, reservationData: any, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'reserved',
      metadata: {
        startDate: reservationData.startDate,
        endDate: reservationData.endDate,
        quantity: reservationData.quantity || 1,
        notes: reservationData.notes
      }
    }, context)
  }

  // Helper method to log availability changes
  async logAvailabilityChange(itemId: string, userId: string, availabilityData: { old: number, new: number, reason: string }, context: TenantContext) {
    return this.createHistoryEntry({
      itemId,
      userId,
      action: 'availability_changed',
      changes: {
        availableCount: { old: availabilityData.old, new: availabilityData.new }
      },
      metadata: {
        reason: availabilityData.reason
      }
    }, context)
  }
}

export default new ItemHistoryService()