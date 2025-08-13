import { ApiService } from './api'

export interface OrgConfiguration {
  id: number
  orgId: number
  instanceId?: number | null
  maxLendingDays: number
  latePenaltyPerDay: number
  maxItemsPerUser: number
  requireApproval: boolean
  allowExtensions: boolean
  maxExtensions: number
  autoBlacklist: boolean
  blacklistThresholdFirst: number
  blacklistThresholdSecond: number
  blacklistThresholdThird: number
  themeConfig?: any
  enabledFeatures?: string[]
  customFields?: any
  emailTemplates?: any
  createdAt?: string
  updatedAt?: string
}

export interface ConfigurationUpdate {
  maxLendingDays?: number
  latePenaltyPerDay?: number
  maxItemsPerUser?: number
  requireApproval?: boolean
  allowExtensions?: boolean
  maxExtensions?: number
  autoBlacklist?: boolean
  blacklistThresholdFirst?: number
  blacklistThresholdSecond?: number
  blacklistThresholdThird?: number
  themeConfig?: any
  enabledFeatures?: string[]
  customFields?: any
  emailTemplates?: any
}

class ConfigurationsService extends ApiService {
  constructor() {
    super('/api/organizations')
  }

  async getConfiguration(orgId: number, instanceId?: number): Promise<OrgConfiguration> {
    const params: Record<string, string> = {}
    if (instanceId) {
      params.instanceId = instanceId.toString()
    }
    
    return this.get<OrgConfiguration>(`/${orgId}/configuration`, params)
  }

  async updateConfiguration(
    orgId: number, 
    data: ConfigurationUpdate & { instanceId?: number }
  ): Promise<OrgConfiguration> {
    return this.put<OrgConfiguration>(`/${orgId}/configuration`, data)
  }
}

export default new ConfigurationsService()