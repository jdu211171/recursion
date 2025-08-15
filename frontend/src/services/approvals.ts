import apiClient from './api'

// Approval system types and interfaces
export interface ApprovalWorkflow {
  id: string
  itemId: string
  userId: string
  orgId: number
  type: 'lending' | 'extension' | 'reservation'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestData: {
    requestedDuration?: number
    notes?: string
    dueDate?: string
    quantity?: number
  }
  approverId?: string
  approverNotes?: string
  createdAt: string
  updatedAt: string
  approvedAt?: string
  rejectedAt?: string
  item: {
    id: string
    name: string
    uniqueId: string
    availableCount: number
    totalCount?: number
  }
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  approver?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  organization: {
    id: number
    name: string
  }
}

export interface CreateApprovalRequest {
  itemId: string
  type: 'lending' | 'extension' | 'reservation'
  requestData?: {
    requestedDuration?: number
    notes?: string
    dueDate?: string
    quantity?: number
  }
}

export interface ApprovalDecision {
  status: 'APPROVED' | 'REJECTED'
  approverNotes?: string
}

export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  byType: Array<{ type: string; _count: { type: number } }>
  recentApprovals: ApprovalWorkflow[]
}

class ApprovalsService {
  // Create new approval request
  async createApprovalRequest(data: CreateApprovalRequest): Promise<ApprovalWorkflow> {
    const response = await apiClient.post('/api/approvals', data)
    return response.data
  }

  // Get approval requests (with filtering)
  async getApprovalRequests(filters?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
    type?: string
    userId?: string
    approverId?: string
    limit?: number
    offset?: number
  }): Promise<ApprovalWorkflow[]> {
    const params = new URLSearchParams()
    
    if (filters?.status) params.append('status', filters.status)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.approverId) params.append('approverId', filters.approverId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/approvals?${params.toString()}`)
    return response.data
  }

  // Get specific approval request by ID
  async getApprovalRequestById(id: string): Promise<ApprovalWorkflow> {
    const response = await apiClient.get(`/api/approvals/${id}`)
    return response.data
  }

  // Get pending approvals (staff/admin only)
  async getPendingApprovals(): Promise<ApprovalWorkflow[]> {
    const response = await apiClient.get('/api/approvals/pending')
    return response.data
  }

  // Get approval statistics (admin only)
  async getApprovalStats(): Promise<ApprovalStats> {
    const response = await apiClient.get('/api/approvals/stats')
    return response.data
  }

  // Process approval decision (staff/admin only)
  async processApprovalDecision(id: string, decision: ApprovalDecision): Promise<ApprovalWorkflow> {
    const response = await apiClient.put(`/api/approvals/${id}/decision`, decision)
    return response.data
  }

  // Cancel approval request
  async cancelApprovalRequest(id: string): Promise<ApprovalWorkflow> {
    const response = await apiClient.put(`/api/approvals/${id}/cancel`)
    return response.data
  }

  // Check if approval is required for organization
  async isApprovalRequired(orgId: number, instanceId?: number): Promise<boolean> {
    const params = new URLSearchParams()
    if (instanceId) params.append('instanceId', instanceId.toString())
    
    const response = await apiClient.get(`/api/approvals/check-required/${orgId}?${params.toString()}`)
    return response.data.approvalRequired
  }

  // Check if current user can approve requests
  async canUserApprove(): Promise<boolean> {
    const response = await apiClient.get('/api/approvals/can-approve')
    return response.data.canApprove
  }

  // Helper functions for UI
  getStatusColor(status: string): 'default' | 'error' | 'warning' | 'info' | 'success' {
    switch (status) {
      case 'PENDING':
        return 'warning'
      case 'APPROVED':
        return 'success'
      case 'REJECTED':
        return 'error'
      case 'CANCELLED':
        return 'default'
      default:
        return 'default'
    }
  }

  getTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'lending':
        return '📚'
      case 'extension':
        return '⏰'
      case 'reservation':
        return '📅'
      default:
        return '📋'
    }
  }

  getTypeLabel(type: string): string {
    switch (type.toLowerCase()) {
      case 'lending':
        return 'Lending Request'
      case 'extension':
        return 'Extension Request'
      case 'reservation':
        return 'Reservation Request'
      default:
        return 'Approval Request'
    }
  }

  formatRequestData(type: string, requestData: any): string {
    if (!requestData) return ''

    const parts: string[] = []
    
    if (requestData.requestedDuration) {
      parts.push(`Duration: ${requestData.requestedDuration} days`)
    }
    
    if (requestData.dueDate) {
      parts.push(`Due: ${new Date(requestData.dueDate).toLocaleDateString()}`)
    }
    
    if (requestData.quantity && requestData.quantity > 1) {
      parts.push(`Quantity: ${requestData.quantity}`)
    }
    
    if (requestData.notes) {
      parts.push(`Notes: ${requestData.notes}`)
    }

    return parts.join(', ')
  }
}

export default new ApprovalsService()