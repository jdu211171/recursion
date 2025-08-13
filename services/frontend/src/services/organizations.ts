import { ApiService } from './api'

export interface Organization {
  id: number
  name: string
  configVersion?: number
  deploymentType?: string
  createdAt: string
  updatedAt: string
  _count?: {
    instances: number
    users: number
    items: number
  }
}

export interface Instance {
  id: number
  name: string
  orgId: number
  organization?: Organization
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    items: number
    categories?: number
  }
}

export interface CreateOrganizationDto {
  name: string
  deploymentType?: string
}

export interface CreateInstanceDto {
  name: string
  orgId: number
}

class OrganizationsService extends ApiService {
  constructor() {
    super('/api/organizations')
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.get<Organization[]>('/')
  }

  async getMyOrganizations(): Promise<Organization[]> {
    return this.get<Organization[]>('/my')
  }

  async getOrganization(orgId: number): Promise<Organization> {
    return this.get<Organization>(`/${orgId}`)
  }

  async getInstances(orgId: number): Promise<Instance[]> {
    return this.get<Instance[]>(`/${orgId}/instances`)
  }

  async createOrganization(data: CreateOrganizationDto): Promise<Organization> {
    return this.post<Organization>('/', data)
  }

  async createInstance(orgId: number, data: Omit<CreateInstanceDto, 'orgId'>): Promise<Instance> {
    return this.post<Instance>(`/${orgId}/instances`, data)
  }

  async updateOrganization(orgId: number, data: Partial<CreateOrganizationDto>): Promise<Organization> {
    return this.put<Organization>(`/${orgId}`, data)
  }

  async updateInstance(orgId: number, instanceId: number, data: { name: string }): Promise<Instance> {
    return this.put<Instance>(`/${orgId}/instances/${instanceId}`, data)
  }
}

export default new OrganizationsService()