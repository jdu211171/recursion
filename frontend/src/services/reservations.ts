import { ApiService } from './api'

export interface Reservation {
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
  reservedFor: string
  expiresAt: string
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'
  fulfilledAt?: string
  cancelledAt?: string
  notes?: string
  metadata?: {
    quantity?: number
  }
  createdAt: string
  updatedAt: string
}

export interface CreateReservationDto {
  itemId: string
  reservedFor: string
  expiresAt: string
  quantity?: number
  notes?: string
}

export interface ReservationFilters {
  userId?: string
  itemId?: string
  status?: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'
  page?: number
  limit?: number
}

export interface ReservationsResponse {
  reservations: Reservation[]
  total: number
  page: number
  limit: number
}

export interface ItemAvailability {
  date: string
  totalCount: number
  availableCount: number
  reservedCount: number
  lentCount: number
}

class ReservationsService extends ApiService {
  constructor() {
    super('/api')
  }

  async createReservation(data: CreateReservationDto): Promise<Reservation> {
    return this.post<Reservation>('/reservations', data)
  }

  async getReservations(filters?: ReservationFilters): Promise<ReservationsResponse> {
    return this.get<ReservationsResponse>('/reservations', filters)
  }

  async cancelReservation(id: string): Promise<Reservation> {
    return this.post<Reservation>(`/reservations/${id}/cancel`)
  }

  async getUpcomingReservations(itemId: string): Promise<Reservation[]> {
    return this.get<Reservation[]>(`/reservations/item/${itemId}/upcoming`)
  }

  async checkItemAvailability(itemId: string, date: string): Promise<ItemAvailability> {
    return this.get<ItemAvailability>(`/reservations/item/${itemId}/availability`, { date })
  }
}

export default new ReservationsService()