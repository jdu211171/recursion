import { PrismaClient, FeedbackStatus } from '@prisma/client'

const prisma = new PrismaClient()

interface TenantContext {
  orgId: number
  instanceId?: number
}

interface CreateFeedbackData {
  title: string
  description: string
  category?: string
  priority?: string
  imageUrls?: string[]
}

interface UpdateFeedbackData {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: FeedbackStatus
  devResponse?: string
  imageUrls?: string[]
}

interface FeedbackFilters {
  status?: FeedbackStatus
  category?: string
  priority?: string
  userId?: string
  limit?: number
  offset?: number
}

export class FeedbackService {
  // Create new feedback submission
  async createFeedback(
    userId: string,
    data: CreateFeedbackData,
    context: TenantContext
  ) {
    return await prisma.userFeedback.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority || 'medium',
        imageUrls: data.imageUrls || [],
        userId,
        orgId: context.orgId,
        instanceId: context.instanceId,
        status: 'PENDING'
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
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  }

  // Get feedback submissions with filtering
  async getFeedback(context: TenantContext, filters: FeedbackFilters = {}) {
    const where: any = {
      orgId: context.orgId
    }

    if (context.instanceId) {
      where.instanceId = context.instanceId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.category) {
      where.category = filters.category
    }

    if (filters.priority) {
      where.priority = filters.priority
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    return await prisma.userFeedback.findMany({
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
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0
    })
  }

  // Get single feedback by ID
  async getFeedbackById(id: string, context: TenantContext) {
    const feedback = await prisma.userFeedback.findFirst({
      where: {
        id,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
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
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!feedback) {
      throw new Error('Feedback not found')
    }

    return feedback
  }

  // Update feedback (admin/dev only for status and response)
  async updateFeedback(
    id: string,
    data: UpdateFeedbackData,
    context: TenantContext,
    isAdmin: boolean = false
  ) {
    const feedback = await this.getFeedbackById(id, context)

    const updateData: any = {}

    // Regular users can only update basic fields if it's their feedback
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls

    // Only admins can update status and dev response
    if (isAdmin) {
      if (data.status !== undefined) {
        updateData.status = data.status
        if (data.status !== 'PENDING') {
          updateData.reviewedAt = new Date()
        }
      }
      if (data.devResponse !== undefined) updateData.devResponse = data.devResponse
    }

    return await prisma.userFeedback.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  }

  // Delete feedback
  async deleteFeedback(id: string, context: TenantContext) {
    const feedback = await this.getFeedbackById(id, context)

    return await prisma.userFeedback.delete({
      where: { id }
    })
  }

  // Get feedback statistics for admin dashboard
  async getFeedbackStats(context: TenantContext) {
    const where: any = {
      orgId: context.orgId
    }

    if (context.instanceId) {
      where.instanceId = context.instanceId
    }

    const [
      total,
      pending,
      inReview,
      resolved,
      byCategory,
      byPriority,
      recentFeedback
    ] = await Promise.all([
      prisma.userFeedback.count({ where }),
      prisma.userFeedback.count({ where: { ...where, status: 'PENDING' } }),
      prisma.userFeedback.count({ where: { ...where, status: 'IN_REVIEW' } }),
      prisma.userFeedback.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.userFeedback.groupBy({
        by: ['category'],
        where,
        _count: { category: true }
      }),
      prisma.userFeedback.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true }
      }),
      prisma.userFeedback.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ])

    return {
      total,
      pending,
      inReview,
      resolved,
      closed: total - pending - inReview - resolved,
      byCategory,
      byPriority,
      recentFeedback
    }
  }

  // Get user's own feedback
  async getUserFeedback(userId: string, context: TenantContext) {
    return await prisma.userFeedback.findMany({
      where: {
        userId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // DEV ONLY: Get all feedback across all organizations (for development review)
  async getAllFeedbackForDev() {
    return await prisma.userFeedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })
  }
}

export default new FeedbackService()