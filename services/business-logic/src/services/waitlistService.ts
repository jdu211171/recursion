import { PrismaClient } from '@prisma/client'
import itemHistoryService from './itemHistoryService'

const prisma = new PrismaClient()

interface TenantContext {
  orgId: number
  instanceId?: number
}

interface CreateWaitlistEntry {
  itemId: string
  userId: string
  priority?: number
  notes?: string
  notifyWhenAvailable?: boolean
}

interface WaitlistFilters {
  itemId?: string
  userId?: string
  status?: 'WAITING' | 'NOTIFIED' | 'EXPIRED' | 'CANCELLED'
  limit?: number
  offset?: number
}

// Note: This service assumes an ItemWaitlist model exists in the database schema
// The model would have fields: id, itemId, userId, orgId, instanceId, priority, status, notifiedAt, expiresAt, etc.

export class WaitlistService {
  // Add user to waitlist for an item
  async addToWaitlist(data: CreateWaitlistEntry, context: TenantContext) {
    // Verify the item exists and belongs to the organization
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

    // Check if user is already on waitlist for this item
    const existingEntry = await this.findExistingWaitlistEntry(data.itemId, data.userId, context)
    if (existingEntry) {
      throw new Error('User is already on the waitlist for this item')
    }

    // Get next position in queue
    const queuePosition = await this.getNextQueuePosition(data.itemId, context)

    // For now, we'll use the Reservation model with a special status to simulate waitlist
    // This is a workaround until the ItemWaitlist model is added to the schema
    const waitlistEntry = await prisma.reservation.create({
      data: {
        itemId: data.itemId,
        userId: data.userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        reservedFor: new Date(), // Immediate
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'ACTIVE', // We'll use metadata to distinguish waitlist entries
        notes: data.notes || 'Waitlist entry',
        metadata: {
          isWaitlist: true,
          queuePosition: queuePosition,
          priority: data.priority || 0,
          notifyWhenAvailable: data.notifyWhenAvailable !== false,
          createdAt: new Date().toISOString()
        }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true,
            totalCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Log waitlist addition to item history
    try {
      await itemHistoryService.createHistoryEntry({
        itemId: data.itemId,
        userId: data.userId,
        action: 'reserved',
        metadata: {
          type: 'waitlist',
          queuePosition,
          notes: data.notes
        }
      }, context)
    } catch (error) {
      console.error('Failed to log waitlist addition:', error)
    }

    return this.formatWaitlistEntry(waitlistEntry)
  }

  // Remove user from waitlist
  async removeFromWaitlist(itemId: string, userId: string, context: TenantContext) {
    const waitlistEntry = await this.findExistingWaitlistEntry(itemId, userId, context)
    
    if (!waitlistEntry) {
      throw new Error('Waitlist entry not found')
    }

    await prisma.reservation.update({
      where: { id: waitlistEntry.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        metadata: {
          ...waitlistEntry.metadata as any,
          cancelledAt: new Date().toISOString()
        }
      }
    })

    // Reorder queue positions
    await this.reorderQueue(itemId, context)

    // Log waitlist removal
    try {
      await itemHistoryService.createHistoryEntry({
        itemId,
        userId,
        action: 'cancelled',
        metadata: {
          type: 'waitlist_removal',
          previousPosition: (waitlistEntry.metadata as any)?.queuePosition
        }
      }, context)
    } catch (error) {
      console.error('Failed to log waitlist removal:', error)
    }
  }

  // Get waitlist entries for an item
  async getItemWaitlist(itemId: string, context: TenantContext, filters: WaitlistFilters = {}) {
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
      itemId,
      orgId: context.orgId,
      status: 'ACTIVE', // Only active reservations
      metadata: {
        path: ['isWaitlist'],
        equals: true
      }
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    const waitlistEntries = await prisma.reservation.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true,
            totalCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        // Order by priority first (higher priority = lower number)
        { metadata: { path: ['priority'], sort: 'asc' } },
        // Then by creation time
        { createdAt: 'asc' }
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0
    })

    return waitlistEntries.map(entry => this.formatWaitlistEntry(entry))
  }

  // Get user's waitlist entries
  async getUserWaitlist(userId: string, context: TenantContext, filters: WaitlistFilters = {}) {
    const where: any = {
      userId,
      orgId: context.orgId,
      status: 'ACTIVE',
      metadata: {
        path: ['isWaitlist'],
        equals: true
      }
    }

    if (filters.itemId) {
      where.itemId = filters.itemId
    }

    const waitlistEntries = await prisma.reservation.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true,
            totalCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    })

    return waitlistEntries.map(entry => this.formatWaitlistEntry(entry))
  }

  // Notify users when item becomes available
  async notifyWaitlistWhenAvailable(itemId: string, context: TenantContext) {
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    })

    if (!item || item.availableCount <= 0) {
      return // Item not available, no need to notify
    }

    // Get waitlist entries that haven't been notified yet
    const waitlistEntries = await prisma.reservation.findMany({
      where: {
        itemId,
        orgId: context.orgId,
        status: 'ACTIVE',
        metadata: {
          path: ['isWaitlist'],
          equals: true
        }
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
            name: true,
            uniqueId: true
          }
        }
      },
      orderBy: [
        { metadata: { path: ['priority'], sort: 'asc' } },
        { createdAt: 'asc' }
      ],
      take: item.availableCount // Only notify as many as are available
    })

    const notifiedUsers = []

    for (const entry of waitlistEntries) {
      const metadata = entry.metadata as any
      if (!metadata.notifiedAt && metadata.notifyWhenAvailable !== false) {
        // Update entry to mark as notified
        await prisma.reservation.update({
          where: { id: entry.id },
          data: {
            metadata: {
              ...metadata,
              notifiedAt: new Date().toISOString(),
              notificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours to respond
            }
          }
        })

        // Create system notification
        try {
          await prisma.systemNotification.create({
            data: {
              userId: entry.userId,
              orgId: context.orgId,
              instanceId: context.instanceId,
              type: 'waitlist_available',
              title: 'Item Available from Waitlist',
              message: `The item "${entry.item.name}" (${entry.item.uniqueId}) you were waiting for is now available. You have 24 hours to reserve it.`,
              metadata: {
                itemId: entry.itemId,
                waitlistEntryId: entry.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
            }
          })
        } catch (error) {
          console.error('Failed to create waitlist notification:', error)
        }

        notifiedUsers.push({
          userId: entry.userId,
          userEmail: entry.user.email,
          userName: `${entry.user.firstName} ${entry.user.lastName}`.trim(),
          queuePosition: metadata.queuePosition
        })
      }
    }

    return notifiedUsers
  }

  // Get waitlist statistics
  async getWaitlistStats(context: TenantContext) {
    const [
      totalWaitlistEntries,
      itemsWithWaitlist,
      avgWaitTime
    ] = await Promise.all([
      prisma.reservation.count({
        where: {
          orgId: context.orgId,
          status: 'ACTIVE',
          metadata: {
            path: ['isWaitlist'],
            equals: true
          }
        }
      }),
      
      prisma.reservation.groupBy({
        by: ['itemId'],
        where: {
          orgId: context.orgId,
          status: 'ACTIVE',
          metadata: {
            path: ['isWaitlist'],
            equals: true
          }
        },
        _count: { itemId: true }
      }),

      // Calculate average wait time (simplified - would need more complex query in real implementation)
      prisma.reservation.findMany({
        where: {
          orgId: context.orgId,
          status: 'FULFILLED',
          metadata: {
            path: ['isWaitlist'],
            equals: true
          }
        },
        select: {
          createdAt: true,
          fulfilledAt: true
        },
        take: 100
      })
    ])

    let avgWaitDays = 0
    if (avgWaitTime.length > 0) {
      const totalWaitTime = avgWaitTime.reduce((sum, entry) => {
        if (entry.fulfilledAt) {
          return sum + (entry.fulfilledAt.getTime() - entry.createdAt.getTime())
        }
        return sum
      }, 0)
      avgWaitDays = Math.floor(totalWaitTime / (avgWaitTime.length * 24 * 60 * 60 * 1000))
    }

    return {
      totalWaitlistEntries,
      itemsWithWaitlistCount: itemsWithWaitlist.length,
      avgWaitDays,
      itemsWithWaitlist: itemsWithWaitlist.slice(0, 10) // Top 10 items with waitlist
    }
  }

  // Private helper methods
  private async findExistingWaitlistEntry(itemId: string, userId: string, context: TenantContext) {
    return await prisma.reservation.findFirst({
      where: {
        itemId,
        userId,
        orgId: context.orgId,
        status: 'ACTIVE',
        metadata: {
          path: ['isWaitlist'],
          equals: true
        }
      }
    })
  }

  private async getNextQueuePosition(itemId: string, context: TenantContext): Promise<number> {
    const count = await prisma.reservation.count({
      where: {
        itemId,
        orgId: context.orgId,
        status: 'ACTIVE',
        metadata: {
          path: ['isWaitlist'],
          equals: true
        }
      }
    })
    return count + 1
  }

  private async reorderQueue(itemId: string, context: TenantContext) {
    const waitlistEntries = await prisma.reservation.findMany({
      where: {
        itemId,
        orgId: context.orgId,
        status: 'ACTIVE',
        metadata: {
          path: ['isWaitlist'],
          equals: true
        }
      },
      orderBy: [
        { metadata: { path: ['priority'], sort: 'asc' } },
        { createdAt: 'asc' }
      ]
    })

    // Update queue positions
    for (let i = 0; i < waitlistEntries.length; i++) {
      const entry = waitlistEntries[i]
      const metadata = entry.metadata as any
      
      await prisma.reservation.update({
        where: { id: entry.id },
        data: {
          metadata: {
            ...metadata,
            queuePosition: i + 1
          }
        }
      })
    }
  }

  private formatWaitlistEntry(reservationEntry: any) {
    const metadata = reservationEntry.metadata as any
    
    return {
      id: reservationEntry.id,
      itemId: reservationEntry.itemId,
      userId: reservationEntry.userId,
      queuePosition: metadata.queuePosition || 0,
      priority: metadata.priority || 0,
      notifyWhenAvailable: metadata.notifyWhenAvailable !== false,
      notifiedAt: metadata.notifiedAt || null,
      notificationExpires: metadata.notificationExpires || null,
      notes: reservationEntry.notes,
      createdAt: reservationEntry.createdAt,
      item: reservationEntry.item,
      user: reservationEntry.user,
      // Additional computed fields
      isNotified: !!metadata.notifiedAt,
      notificationActive: metadata.notifiedAt && metadata.notificationExpires && 
                         new Date(metadata.notificationExpires) > new Date()
    }
  }
}

export default new WaitlistService()