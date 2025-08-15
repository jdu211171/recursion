import { ApiService } from './api'

export interface Lending {
  id: string
  itemId: string
  item?: {
    id: string
    name: string
    uniqueId: string
  }
  userId: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  orgId: number
  instanceId?: number
  borrowedAt: string
  dueDate: string
  returnedAt?: string
  penalty?: number
  penaltyReason?: string
  penaltyOverride: boolean
  notes?: string
  metadata?: {
    quantity?: number
  }
  createdAt: string
  updatedAt: string
}

export interface CheckoutDto {
  itemId: string
  userId?: string // Optional, defaults to current user
  dueDate: string
  quantity?: number
  notes?: string
}

export interface ReturnDto {
  returnedAt?: string // Optional, defaults to now
  notes?: string
}

export interface PenaltyCalculation {
  amount: number
  reason: string
  daysOverdue?: number
}

export interface PenaltyOverrideDto {
  penalty: number
  reason: string
}

export interface BlacklistDto {
  userId: string
  reason: string
  blockedUntil: string
}

export interface Blacklist {
  id: string
  userId: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  orgId: number
  instanceId?: number
  reason: string
  blockedUntil: string
  isActive: boolean
  overriddenBy?: string
  overriddenAt?: string
  createdAt: string
  updatedAt: string
}

export interface LendingFilters {
  userId?: string
  itemId?: string
  status?: 'active' | 'overdue' | 'returned'
  page?: number
  limit?: number
}

export interface LendingResponse {
  lendings: Lending[]
  total: number
  page: number
  limit: number
}

class LendingService extends ApiService {
  constructor() {
    super('/api')
  }

  async checkout(data: CheckoutDto): Promise<Lending> {
    return this.post<Lending>('/lending/checkout', data)
  }

  async return(lendingId: string, data?: ReturnDto): Promise<Lending> {
    return this.post<Lending>(`/lending/${lendingId}/return`, data)
  }

  async getLendings(filters?: LendingFilters): Promise<LendingResponse> {
    return this.get<LendingResponse>('/lending', filters)
  }

  async calculatePenalty(lendingId: string): Promise<PenaltyCalculation> {
    return this.get<PenaltyCalculation>(`/lending/${lendingId}/penalty`)
  }

  async overridePenalty(lendingId: string, data: PenaltyOverrideDto): Promise<Lending> {
    return this.post<Lending>(`/lending/${lendingId}/penalty/override`, data)
  }

  async createBlacklist(data: BlacklistDto): Promise<Blacklist> {
    return this.post<Blacklist>('/lending/blacklist', data)
  }

  async removeBlacklist(blacklistId: string): Promise<void> {
    return this.delete<void>(`/lending/blacklist/${blacklistId}`)
  }
}

export default new LendingService()