import { PrismaClient, ApprovalStatus } from '@prisma/client'

const prisma = new PrismaClient()

interface TenantContext {
  orgId: number
  instanceId?: number
}

interface CreateApprovalRequest {
  itemId: string
  type: 'lending' | 'extension' | 'reservation'
  requestData: {
    requestedDuration?: number
    notes?: string
    dueDate?: string
    quantity?: number
  }
}

interface ApprovalDecision {
  status: 'APPROVED' | 'REJECTED'
  approverNotes?: string
}

interface ApprovalFilters {
  status?: ApprovalStatus
  type?: string
  userId?: string
  approverId?: string
  limit?: number
  offset?: number
}

export class ApprovalWorkflowService {
  // Create a new approval request
  async createApprovalRequest(
    userId: string,
    data: CreateApprovalRequest,
    context: TenantContext
  ) {
    // Check if item exists and belongs to the organization
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

    return await prisma.approvalWorkflow.create({
      data: {
        itemId: data.itemId,
        userId,
        orgId: context.orgId,
        type: data.type,
        requestData: data.requestData,
        status: 'PENDING'
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        approver: {
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
        }
      }
    })
  }

  // Get approval requests with filtering
  async getApprovalRequests(context: TenantContext, filters: ApprovalFilters = {}) {
    const where: any = {
      orgId: context.orgId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.approverId) {
      where.approverId = filters.approverId
    }

    return await prisma.approvalWorkflow.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        approver: {
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
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0
    })
  }

  // Get specific approval request by ID
  async getApprovalRequestById(id: string, context: TenantContext) {
    const approval = await prisma.approvalWorkflow.findFirst({
      where: {
        id,
        orgId: context.orgId
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
        },
        approver: {
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
        }
      }
    })

    if (!approval) {
      throw new Error('Approval request not found')
    }

    return approval
  }

  // Process approval decision (approve/reject)
  async processApprovalDecision(
    id: string,
    approverId: string,
    decision: ApprovalDecision,
    context: TenantContext
  ) {
    const approval = await this.getApprovalRequestById(id, context)

    if (approval.status !== 'PENDING') {
      throw new Error('Approval request has already been processed')
    }

    const updateData: any = {
      approverId,
      status: decision.status,
      approverNotes: decision.approverNotes,
      updatedAt: new Date()
    }

    if (decision.status === 'APPROVED') {
      updateData.approvedAt = new Date()
    } else {
      updateData.rejectedAt = new Date()
    }

    const updatedApproval = await prisma.approvalWorkflow.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // If approved and it's a lending request, we could automatically create the lending
    // This would be integrated with the lending service
    if (decision.status === 'APPROVED' && approval.type === 'lending') {
      // TODO: Integration point with lending service
      // await lendingService.createLendingFromApproval(updatedApproval)
    }

    return updatedApproval
  }

  // Cancel approval request (by user who created it or admin)
  async cancelApprovalRequest(id: string, userId: string, context: TenantContext, isAdmin: boolean = false) {
    const approval = await this.getApprovalRequestById(id, context)

    // Only the user who created the request or admin can cancel it
    if (!isAdmin && approval.userId !== userId) {
      throw new Error('Access denied')
    }

    if (approval.status !== 'PENDING') {
      throw new Error('Only pending approval requests can be cancelled')
    }

    return await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true
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
  }

  // Get approval statistics for admin dashboard
  async getApprovalStats(context: TenantContext) {
    const where: any = {
      orgId: context.orgId
    }

    const [
      total,
      pending,
      approved,
      rejected,
      cancelled,
      byType,
      recentApprovals
    ] = await Promise.all([
      prisma.approvalWorkflow.count({ where }),
      prisma.approvalWorkflow.count({ where: { ...where, status: 'PENDING' } }),
      prisma.approvalWorkflow.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.approvalWorkflow.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.approvalWorkflow.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.approvalWorkflow.groupBy({
        by: ['type'],
        where,
        _count: { type: true }
      }),
      prisma.approvalWorkflow.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              name: true,
              uniqueId: true
            }
          },
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
      approved,
      rejected,
      cancelled,
      byType,
      recentApprovals
    }
  }

  // Get user's own approval requests
  async getUserApprovalRequests(userId: string, context: TenantContext) {
    return await prisma.approvalWorkflow.findMany({
      where: {
        userId,
        orgId: context.orgId
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            uniqueId: true,
            availableCount: true
          }
        },
        approver: {
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
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Check if approval is required for an organization's lending policy
  async isApprovalRequired(context: TenantContext): Promise<boolean> {
    const orgConfig = await prisma.orgConfiguration.findFirst({
      where: {
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    })

    return orgConfig?.requireApproval ?? false
  }

  // Helper method to check if user can approve requests
  async canUserApprove(userId: string, context: TenantContext): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId: context.orgId
      }
    })

    return user?.role === 'ADMIN' || user?.role === 'STAFF'
  }
}

export default new ApprovalWorkflowService()