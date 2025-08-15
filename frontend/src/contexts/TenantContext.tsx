import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface Organization { id: string; name: string }
export interface Instance { id: string; name: string }

interface TenantContextType {
  organizations: Organization[]
  instances: Instance[]
  currentOrg: Organization | null
  currentInstance: Instance | null
  setCurrentOrg: (org: Organization | null) => void
  setCurrentInstance: (instance: Instance | null) => void
}

const Ctx = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [organizations] = useState<Organization[]>([])
  const [instances] = useState<Instance[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null)

  const value = useMemo<TenantContextType>(() => ({
    organizations,
    instances,
    currentOrg,
    currentInstance,
    setCurrentOrg,
    setCurrentInstance,
  }), [organizations, instances, currentOrg, currentInstance])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTenant() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

