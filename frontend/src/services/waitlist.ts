import apiClient from './api'

export interface WaitlistEntry {
  id: string
  itemId: string
  userId: string
  queuePosition: number
  priority: number
  notifyWhenAvailable: boolean
  notifiedAt?: string
  notificationExpires?: string
  notes?: string
  createdAt: string
  item: {
    id: string
    name: string
    uniqueId: string
    availableCount: number
    totalCount: number
  }
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  isNotified: boolean
  notificationActive: boolean
}

export interface WaitlistStats {
  totalWaitlistEntries: number
  itemsWithWaitlistCount: number
  avgWaitDays: number
  itemsWithWaitlist: Array<{
    itemId: string
    _count: { itemId: number }
  }>
}

export interface CreateWaitlistEntry {
  itemId: string
  priority?: number
  notes?: string
  notifyWhenAvailable?: boolean
}

export interface WaitlistStatus {
  isOnWaitlist: boolean
  queuePosition?: number
  notified: boolean
  notificationActive: boolean
}

class WaitlistService {
  // Add user to waitlist for an item
  async addToWaitlist(data: CreateWaitlistEntry): Promise<WaitlistEntry> {
    const response = await apiClient.post('/api/waitlist', data)
    return response.data
  }

  // Remove user from waitlist for an item
  async removeFromWaitlist(itemId: string): Promise<void> {
    await apiClient.delete(`/api/waitlist/${itemId}`)
  }

  // Get waitlist entries for a specific item (admin/staff only)
  async getItemWaitlist(itemId: string, filters?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<WaitlistEntry[]> {
    const params = new URLSearchParams()
    
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/waitlist/item/${itemId}?${params.toString()}`)
    return response.data
  }

  // Get current user's waitlist entries
  async getUserWaitlist(filters?: {
    itemId?: string
    limit?: number
    offset?: number
  }): Promise<WaitlistEntry[]> {
    const params = new URLSearchParams()
    
    if (filters?.itemId) params.append('itemId', filters.itemId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/waitlist/user?${params.toString()}`)
    return response.data
  }

  // Get specific user's waitlist entries (admin/staff only)
  async getSpecificUserWaitlist(userId: string, filters?: {
    itemId?: string
    limit?: number
    offset?: number
  }): Promise<WaitlistEntry[]> {
    const params = new URLSearchParams()
    
    if (filters?.itemId) params.append('itemId', filters.itemId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get(`/api/waitlist/user/${userId}?${params.toString()}`)
    return response.data
  }

  // Manually trigger notifications for item waitlist (admin/staff only)
  async notifyWaitlist(itemId: string): Promise<{ message: string; notifiedUsers: any[] }> {
    const response = await apiClient.post(`/api/waitlist/notify/${itemId}`)
    return response.data
  }

  // Get waitlist statistics (admin/staff only)
  async getWaitlistStats(): Promise<WaitlistStats> {
    const response = await apiClient.get('/api/waitlist/stats')
    return response.data
  }

  // Admin operations on waitlist entries (admin/staff only)
  async adminAction(itemId: string, userId: string, action: 'remove' | 'notify'): Promise<any> {
    const response = await apiClient.put(`/api/waitlist/admin/${itemId}/${userId}`, { action })
    return response.data
  }

  // Check if current user is on waitlist for item
  async checkWaitlistStatus(itemId: string): Promise<WaitlistStatus> {
    const response = await apiClient.get(`/api/waitlist/check/${itemId}`)
    return response.data
  }

  // Helper functions for UI
  getQueuePositionColor(position: number): 'success' | 'warning' | 'error' | 'info' {
    if (position <= 2) return 'success'
    if (position <= 5) return 'info'
    if (position <= 10) return 'warning'
    return 'error'
  }

  getPriorityLabel(priority: number): string {
    if (priority <= 0) return 'Normal'
    if (priority === 1) return 'High'
    if (priority === 2) return 'Very High'
    return 'Critical'
  }

  getPriorityColor(priority: number): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    if (priority <= 0) return 'default'
    if (priority === 1) return 'warning'
    if (priority === 2) return 'error'
    return 'error'
  }

  formatWaitTime(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours > 0 ? `${diffHours}h` : ''}`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''}`
    }
  }

  isNotificationExpired(entry: WaitlistEntry): boolean {
    if (!entry.notificationExpires) return false
    return new Date(entry.notificationExpires) < new Date()
  }

  getTimeUntilExpiration(entry: WaitlistEntry): string | null {
    if (!entry.notificationExpires) return null
    
    const expires = new Date(entry.notificationExpires)
    const now = new Date()
    
    if (expires < now) return 'Expired'
    
    const diffMs = expires.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    } else {
      return `${diffMinutes}m`
    }
  }
}

export default new WaitlistService()