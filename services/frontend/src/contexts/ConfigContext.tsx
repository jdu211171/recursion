import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTenant } from './useTenant'
import configurationsService from '../services/configurations'

interface OrganizationConfig {
  lending_duration_days: number
  max_renewals: number
  late_fee_per_day: number
  max_items_per_user: number
  reservation_duration_days: number
  blacklist_threshold_days: number
  auto_blacklist_enabled: boolean
  require_approval: boolean
  allowed_file_types: string[]
  max_file_size_mb: number
  email_templates: Record<string, any>
  theme_primary_color: string
  theme_secondary_color: string
  custom_css: string
  feature_flags?: Record<string, boolean>
  custom_fields?: Array<{
    id: string
    fieldName: string
    fieldType: string
    entityType: string
    required: boolean
    options?: string[]
  }>
}

interface ConfigContextType {
  config: OrganizationConfig | null
  loading: boolean
  error: string | null
  refreshConfig: () => Promise<void>
  updateConfig: (newConfig: Partial<OrganizationConfig>) => Promise<void>
  isFeatureEnabled: (featureName: string) => boolean
  getCustomFields: (entityType: string) => Array<any>
}

const defaultConfig: OrganizationConfig = {
  lending_duration_days: 14,
  max_renewals: 2,
  late_fee_per_day: 1.0,
  max_items_per_user: 5,
  reservation_duration_days: 3,
  blacklist_threshold_days: 30,
  auto_blacklist_enabled: true,
  require_approval: false,
  allowed_file_types: ['pdf', 'jpg', 'png'],
  max_file_size_mb: 25,
  email_templates: {},
  theme_primary_color: '#1976d2',
  theme_secondary_color: '#dc004e',
  custom_css: '',
  feature_flags: {},
  custom_fields: []
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: false,
  error: null,
  refreshConfig: async () => {},
  updateConfig: async () => {},
  isFeatureEnabled: () => false,
  getCustomFields: () => []
})

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}

interface ConfigProviderProps {
  children: ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const { currentOrg, currentInstance } = useTenant()
  const [config, setConfig] = useState<OrganizationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    if (!currentOrg) {
      setConfig(defaultConfig)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const orgConfig = await configurationsService.getConfiguration(currentOrg.id)
      
      // Merge with defaults to ensure all properties exist
      const mergedConfig: OrganizationConfig = {
        ...defaultConfig,
        ...orgConfig,
        feature_flags: orgConfig.feature_flags || {},
        custom_fields: orgConfig.custom_fields || []
      }

      setConfig(mergedConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration')
      setConfig(defaultConfig) // Fallback to defaults
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (newConfig: Partial<OrganizationConfig>) => {
    if (!currentOrg || !config) return

    try {
      const updatedConfig = { ...config, ...newConfig }
      await configurationsService.updateConfiguration(currentOrg.id, updatedConfig)
      setConfig(updatedConfig)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update configuration')
    }
  }

  const isFeatureEnabled = (featureName: string): boolean => {
    if (!config?.feature_flags) return false
    return config.feature_flags[featureName] === true
  }

  const getCustomFields = (entityType: string) => {
    if (!config?.custom_fields) return []
    return config.custom_fields.filter(field => field.entityType === entityType)
  }

  useEffect(() => {
    fetchConfig()
  }, [currentOrg, currentInstance])

  const contextValue: ConfigContextType = {
    config,
    loading,
    error,
    refreshConfig: fetchConfig,
    updateConfig,
    isFeatureEnabled,
    getCustomFields
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  )
}