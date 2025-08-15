import { ApiService } from './api'

export interface Category {
  id: string
  name: string
  description?: string
  orgId: number
  instanceId?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryDto {
  name: string
  description?: string
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

class CategoriesService extends ApiService {
  constructor() {
    super('/api')
  }

  async getCategories(): Promise<Category[]> {
    return this.get<Category[]>('/categories')
  }

  async createCategory(data: CreateCategoryDto): Promise<Category> {
    return this.post<Category>('/categories', data)
  }

  async updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.put<Category>(`/categories/${id}`, data)
  }

  async deleteCategory(id: string): Promise<void> {
    return this.delete<void>(`/categories/${id}`)
  }
}

export default new CategoriesService()