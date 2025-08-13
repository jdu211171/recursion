import apiClient from './api'

export interface ItemHistoryEntry {
  id: string
  itemId: string
  userId: string
  action: 'created' | 'updated' | 'borrowed' | 'returned' | 'deleted' | 'reserved' | 'cancelled' | 'approved' | 'rejected' | 'availability_changed'
  changes?: Record<string, { old: any, new: any }>
  metadata?: Record<string, any>
  createdAt: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  item: {
    id: string
    name: string
    uniqueId: string
  }
}

export interface HistoryStats {
  totalActions: number
  actionBreakdown: Array<{ action: string; _count: { action: number } }>
  mostActiveItems: Array<{
    item: {
      id: string
      name: string
      uniqueId: string
    }
    actionCount: number
  }>
  mostActiveUsers: Array<{
    user: {
      id: string
      email: string
      firstName?: string
      lastName?: string
    }
    actionCount: number
  }>
}

export interface CreateHistoryEntry {
  action: string
  changes?: Record<string, { old: any, new: any }>
  metadata?: Record<string, any>
  notes?: string
}

export interface ActionType {
  value: string
  label: string
  description: string
}

class ItemHistoryService {
  // Get history for a specific item
  async getItemHistory(itemId: string, filters?: {
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<ItemHistoryEntry[]> {
    const params = new URLSearchParams()
    
    if (filters?.action) params.append('action', filters.action)
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/item-history/${itemId}?${params.toString()}`)
    return response.data
  }

  // Get organization-wide history (admin/staff only)
  async getOrganizationHistory(filters?: {
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<ItemHistoryEntry[]> {
    const params = new URLSearchParams()
    
    if (filters?.action) params.append('action', filters.action)
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/item-history?${params.toString()}`)
    return response.data
  }

  // Get history statistics (admin/staff only)
  async getHistoryStats(timeRange?: { startDate: string; endDate: string }): Promise<HistoryStats> {
    const params = new URLSearchParams()
    
    if (timeRange?.startDate) params.append('startDate', timeRange.startDate)
    if (timeRange?.endDate) params.append('endDate', timeRange.endDate)

    const response = await apiClient.get(`/api/item-history/stats/overview?${params.toString()}`)
    return response.data
  }

  // Manually add history entry (admin/staff only)
  async createManualHistoryEntry(itemId: string, data: CreateHistoryEntry): Promise<ItemHistoryEntry> {
    const response = await apiClient.post(`/api/item-history/${itemId}/manual`, data)
    return response.data
  }

  // Get available action types
  async getActionTypes(): Promise<ActionType[]> {
    const response = await apiClient.get('/api/item-history/actions/types')
    return response.data
  }

  // Helper functions for UI
  getActionColor(action: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    switch (action.toLowerCase()) {
      case 'created':
        return 'success'
      case 'updated':
        return 'info'
      case 'borrowed':
        return 'primary'
      case 'returned':
        return 'success'
      case 'reserved':
        return 'secondary'
      case 'cancelled':
        return 'warning'
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      case 'availability_changed':
        return 'info'
      case 'deleted':
        return 'error'
      default:
        return 'default'
    }
  }

  getActionIcon(action: string): string {
    switch (action.toLowerCase()) {
      case 'created':
        return '➕'
      case 'updated':
        return '✏️'
      case 'borrowed':
        return '📚'
      case 'returned':
        return '↩️'
      case 'reserved':
        return '📅'
      case 'cancelled':
        return '❌'
      case 'approved':
        return '✅'
      case 'rejected':
        return '❌'
      case 'availability_changed':
        return '🔄'
      case 'deleted':
        return '🗑️'
      default:
        return '📋'
    }
  }

  getActionLabel(action: string): string {
    switch (action.toLowerCase()) {
      case 'created':
        return 'Created'
      case 'updated':
        return 'Updated'
      case 'borrowed':
        return 'Borrowed'
      case 'returned':
        return 'Returned'
      case 'reserved':
        return 'Reserved'
      case 'cancelled':
        return 'Cancelled'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'availability_changed':
        return 'Availability Changed'
      case 'deleted':
        return 'Deleted'
      default:
        return action.charAt(0).toUpperCase() + action.slice(1)
    }
  }

  formatChanges(changes?: Record<string, { old: any, new: any }>): string {
    if (!changes || Object.keys(changes).length === 0) {
      return ''
    }

    const changeStrings = Object.entries(changes).map(([field, change]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1)
      return `${fieldName}: ${change.old} → ${change.new}`
    })

    return changeStrings.join(', ')
  }

  formatMetadata(metadata?: Record<string, any>): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return ''
    }

    // Format common metadata fields
    const formatted: string[] = []
    
    if (metadata.name) formatted.push(`Name: ${metadata.name}`)
    if (metadata.uniqueId) formatted.push(`ID: ${metadata.uniqueId}`)
    if (metadata.quantity && metadata.quantity !== 1) formatted.push(`Quantity: ${metadata.quantity}`)
    if (metadata.dueDate) formatted.push(`Due: ${new Date(metadata.dueDate).toLocaleDateString()}`)
    if (metadata.penalty) formatted.push(`Penalty: $${metadata.penalty}`)
    if (metadata.daysLate) formatted.push(`Days Late: ${metadata.daysLate}`)
    if (metadata.notes) formatted.push(`Notes: ${metadata.notes}`)
    if (metadata.reason) formatted.push(`Reason: ${metadata.reason}`)

    return formatted.join(' • ')
  }
}

export default new ItemHistoryService()