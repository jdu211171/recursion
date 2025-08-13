import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface OrganizationConfig {
  theme_primary_color: string
  theme_secondary_color: string
}

interface ConfigContextType {
  config: OrganizationConfig | null
  loading: boolean
  error: string | null
  refreshConfig: () => Promise<void>
  updateConfig: (next: Partial<OrganizationConfig>) => Promise<void>
  isFeatureEnabled: (name: string) => boolean
  getCustomFields: (entityType: string) => Array<any>
}

const defaultConfig: OrganizationConfig = {
  theme_primary_color: '#7c9fff',
  theme_secondary_color: '#f9a8d4',
}

const Ctx = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OrganizationConfig | null>(defaultConfig)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const value = useMemo<ConfigContextType>(() => ({
    config,
    loading,
    error,
    refreshConfig: async () => {},
    updateConfig: async (next) => { setConfig(prev => ({ ...(prev ?? defaultConfig), ...next })) },
    isFeatureEnabled: () => false,
    getCustomFields: () => [],
  }), [config, loading, error])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConfig() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}

