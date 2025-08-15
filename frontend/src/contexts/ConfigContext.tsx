import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface OrganizationConfig {
  theme_primary_color: string
  theme_secondary_color: string
}

interface ConfigContextType {
  config: OrganizationConfig | null
  updateConfig: (next: Partial<OrganizationConfig>) => void
}

const defaultConfig: OrganizationConfig = {
  theme_primary_color: '#7c9fff',
  theme_secondary_color: '#f9a8d4',
}

const Ctx = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OrganizationConfig | null>(defaultConfig)
  const value = useMemo<ConfigContextType>(() => ({
    config,
    updateConfig: (next) => setConfig(prev => ({ ...(prev ?? defaultConfig), ...next })),
  }), [config])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConfig() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}

