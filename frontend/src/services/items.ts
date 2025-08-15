import { ApiService } from './api'

export interface Item {
  id: string
  uniqueId: string
  name: string
  description?: string
  categoryId?: string
  category?: {
    id: string
    name: string
  }
  orgId: number
  instanceId?: number
  totalCount: number
  availableCount: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CreateItemDto {
  uniqueId: string
  name: string
  description?: string
  categoryId?: string
  totalCount: number
  metadata?: Record<string, any>
}

export interface UpdateItemDto extends Partial<CreateItemDto> {}

export interface ItemsResponse {
  items: Item[]
  total: number
  page: number
  limit: number
}

export interface ItemFilters {
  search?: string
  categoryId?: string
  isAvailable?: boolean
  page?: number
  limit?: number
}

class ItemsService extends ApiService {
  constructor() {
    super('/api')
  }

  async getItems(filters?: ItemFilters): Promise<ItemsResponse> {
    return this.get<ItemsResponse>('/items', filters)
  }

  async getItem(id: string): Promise<Item> {
    return this.get<Item>(`/items/${id}`)
  }

  async createItem(data: CreateItemDto): Promise<Item> {
    return this.post<Item>('/items', data)
  }

  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    return this.put<Item>(`/items/${id}`, data)
  }

  async deleteItem(id: string): Promise<void> {
    return this.delete<void>(`/items/${id}`)
  }
}

export default new ItemsService()