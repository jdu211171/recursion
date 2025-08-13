import { ApiService } from './api'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  contactInfo?: string
  role: 'ADMIN' | 'STAFF' | 'BORROWER'
  orgId: number
  instanceId?: number
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  organization?: {
    id: number
    name: string
  }
  instance?: {
    id: number
    name: string
  }
  blacklistStatus?: {
    isBlacklisted: boolean
    until?: string
    reason?: string
  }
}

export interface CreateUserDto {
  email: string
  password: string
  firstName?: string
  lastName?: string
  contactInfo?: string
  role: 'ADMIN' | 'STAFF' | 'BORROWER'
  orgId: number
  instanceId?: number
}

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  contactInfo?: string
  role?: 'ADMIN' | 'STAFF' | 'BORROWER'
  isActive?: boolean
}

export interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
}

export interface UserFilters {
  search?: string
  role?: string
  isActive?: boolean
  isBlacklisted?: boolean
  page?: number
  limit?: number
}

interface PaginationResponse {
  page: number
  limit: number
  total: number
  pages: number
}

interface UsersApiResponse {
  users: User[]
  pagination: PaginationResponse
}

class UsersService extends ApiService {
  constructor() {
    super('/api/auth')
  }

  async getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
    const params: Record<string, string> = {}
    
    if (filters.search) params.search = filters.search
    if (filters.role) params.role = filters.role
    if (filters.isActive !== undefined) params.isActive = filters.isActive.toString()
    if (filters.isBlacklisted !== undefined) params.isBlacklisted = filters.isBlacklisted.toString()
    if (filters.page) params.page = filters.page.toString()
    if (filters.limit) params.limit = filters.limit.toString()

    const response = await this.get<UsersApiResponse>('/users', params)
    return {
      users: response.users,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit
    }
  }

  async getUser(id: string): Promise<User> {
    const user = await this.get<User>(`/users/${id}`)
    
    // Check if user has active blacklist
    try {
      const blacklistStatus = await this.getUserBlacklistStatus(id)
      return { ...user, blacklistStatus }
    } catch {
      return user
    }
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return this.post<User>('/users', data)
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    return this.put<User>(`/users/${id}`, data)
  }

  async deleteUser(id: string): Promise<void> {
    await this.delete(`/users/${id}`)
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.post(`/users/${id}/reset-password`, { newPassword })
  }

  async getUserActivity(id: string, page = 1, limit = 20): Promise<any> {
    return this.get(`/users/${id}/activity`, { page: page.toString(), limit: limit.toString() })
  }

  async getUserSessions(id: string): Promise<any[]> {
    return this.get(`/users/${id}/sessions`)
  }

  async blacklistUser(userId: string, reason: string, duration = 7): Promise<void> {
    await this.post(`/users/${userId}/blacklist`, { 
      action: 'add', 
      reason, 
      duration 
    })
  }

  async removeFromBlacklist(userId: string): Promise<void> {
    await this.post(`/users/${userId}/blacklist`, { action: 'remove' })
  }

  private async getUserBlacklistStatus(userId: string): Promise<any> {
    // This would need a backend endpoint to check current blacklist status
    // For now, returning null
    return null
  }
}

export default new UsersService()