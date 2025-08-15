import apiClient from './api'

// Feedback service types and interfaces
export interface Feedback {
  id: string
  title: string
  description: string
  category?: string
  priority: string
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
  imageUrls: string[]
  devResponse?: string
  userId: string
  orgId: number
  instanceId?: number
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  organization: {
    id: number
    name: string
  }
  instance?: {
    id: number
    name: string
  }
}

export interface CreateFeedbackData {
  title: string
  description: string
  category?: string
  priority?: string
  images?: File[]
}

export interface UpdateFeedbackData {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string
  devResponse?: string
  images?: File[]
}

export interface FeedbackStats {
  total: number
  pending: number
  inReview: number
  resolved: number
  closed: number
  byCategory: Array<{ category: string | null; _count: { category: number } }>
  byPriority: Array<{ priority: string; _count: { priority: number } }>
  recentFeedback: Feedback[]
}

class FeedbackService {
  // Create new feedback
  async createFeedback(data: CreateFeedbackData): Promise<Feedback> {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('description', data.description)
    
    if (data.category) {
      formData.append('category', data.category)
    }
    
    if (data.priority) {
      formData.append('priority', data.priority)
    }

    // Add image files
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images', image)
      })
    }

    const response = await apiClient.upload<Feedback>('/feedback', formData)
    return response
  }

  // Get feedback (filtered based on user role)
  async getFeedback(filters?: {
    status?: string
    category?: string
    priority?: string
    userId?: string
    limit?: number
    offset?: number
  }): Promise<Feedback[]> {
    const params = new URLSearchParams()
    
    if (filters?.status) params.append('status', filters.status)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    return await apiClient.get<Feedback[]>(`/feedback?${params.toString()}`)
  }

  // Get specific feedback by ID
  async getFeedbackById(id: string): Promise<Feedback> {
    return await apiClient.get<Feedback>(`/feedback/${id}`)
  }

  // Update feedback
  async updateFeedback(id: string, data: UpdateFeedbackData): Promise<Feedback> {
    const formData = new FormData()
    
    if (data.title !== undefined) formData.append('title', data.title)
    if (data.description !== undefined) formData.append('description', data.description)
    if (data.category !== undefined) formData.append('category', data.category)
    if (data.priority !== undefined) formData.append('priority', data.priority)
    if (data.status !== undefined) formData.append('status', data.status)
    if (data.devResponse !== undefined) formData.append('devResponse', data.devResponse)

    // Add new image files
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images', image)
      })
    }

    // For now, convert FormData to plain object if no images
    if (!data.images || data.images.length === 0) {
      const plainData: any = {}
      formData.forEach((value, key) => {
        plainData[key] = value
      })
      const response = await apiClient.put<Feedback>(`/feedback/${id}`, plainData)
      return response
    } else {
      // TODO: Add support for PUT with multipart/form-data in ApiService
      throw new Error('Image updates not yet supported')
    }
  }

  // Delete feedback
  async deleteFeedback(id: string): Promise<void> {
    await apiClient.delete(`/feedback/${id}`)
  }

  // Get feedback statistics (admin only)
  async getFeedbackStats(): Promise<FeedbackStats> {
    return await apiClient.get<FeedbackStats>('/feedback/stats')
  }

  // Get dev feedback (dev only with secret)
  async getDevFeedback(devSecret: string): Promise<Feedback[]> {
    // Use fetch directly for custom headers since ApiService.get doesn't support them
    const response = await fetch('/api/feedback/dev/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Secret': devSecret
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get dev feedback' }))
      throw new Error(error.error || 'Failed to get dev feedback')
    }
    
    return response.json()
  }

  // Helper functions for UI
  getPriorityColor(priority: string): 'error' | 'warning' | 'info' | 'success' {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'error'
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'info'
    }
  }

  getStatusColor(status: string): 'default' | 'error' | 'warning' | 'info' | 'success' {
    switch (status) {
      case 'PENDING':
        return 'warning'
      case 'IN_REVIEW':
        return 'info'
      case 'RESOLVED':
        return 'success'
      case 'CLOSED':
        return 'default'
      case 'CANCELLED':
        return 'error'
      default:
        return 'default'
    }
  }

  getCategoryIcon(category?: string): string {
    switch (category?.toLowerCase()) {
      case 'bug':
        return '🐛'
      case 'feature_request':
        return '💡'
      case 'improvement':
        return '⚡'
      case 'other':
        return '💬'
      default:
        return '📝'
    }
  }
}

const feedbackService = new FeedbackService()
export default feedbackService