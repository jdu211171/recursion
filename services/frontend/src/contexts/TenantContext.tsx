/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import authService from '../services/auth'
import organizationsService from '../services/organizations'
import type { Organization, Instance } from '../services/organizations'

interface TenantContextType {
  organizations: Organization[]
  instances: Instance[]
  currentOrg: Organization | null
  currentInstance: Instance | null
  setCurrentOrg: (org: Organization | null) => void
  setCurrentInstance: (instance: Instance | null) => void
  refreshOrganizations: () => Promise<void>
  refreshInstances: () => Promise<void>
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [instances, setInstances] = useState<Instance[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null)

  const refreshOrganizations = async () => {
    try {
      const user = authService.getUser()
      if (!user) {
        // User not logged in yet
        setOrganizations([])
        return
      }

      // Use different endpoints based on user role
      const data = user.role === 'ADMIN' 
        ? await organizationsService.getOrganizations()
        : await organizationsService.getMyOrganizations()
      
      setOrganizations(data)
      
      // Set default org if not set
      if (!currentOrg && data.length > 0) {
        const userOrg = data.find((org: Organization) => org.id === user?.orgId)
        setCurrentOrg(userOrg || data[0])
      }
    } catch (error: any) {
      console.error('Failed to fetch organizations:', error)
      
      // Handle specific error cases
      if (error?.statusCode === 403 || error?.error === 'Insufficient permissions') {
        if (user?.role !== 'ADMIN') {
          // Non-admin users might not have any organizations yet
          setOrganizations([])
        } else {
          alert('You do not have permission to view all organizations. Please contact your system administrator.')
        }
      } else if (error?.statusCode === 404 || error?.error === 'Route not found') {
        alert('Organization service is not available. Please ensure all services are running.')
      } else {
        alert('Failed to load organizations. Please try refreshing the page.')
      }
    }
  }

  const refreshInstances = async () => {
    if (!currentOrg) {
      setInstances([])
      return
    }
    
    try {
      const data = await organizationsService.getInstances(currentOrg.id)
      setInstances(data)
      
      // Set default instance if not set
      if (!currentInstance && data.length > 0) {
        const user = authService.getUser()
        const userInstance = data.find((inst: Instance) => inst.id === user?.instanceId)
        setCurrentInstance(userInstance || data[0])
      }
    } catch (error: any) {
      console.error('Failed to fetch instances:', error)
      
      // Handle specific error cases
      if (error?.statusCode === 403 || error?.error === 'Insufficient permissions') {
        alert('You do not have permission to view instances for this organization.')
      } else {
        console.error('Failed to load instances for organization.')
      }
    }
  }

  useEffect(() => {
    // Initial load
    refreshOrganizations()
    
    // Listen for auth state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        refreshOrganizations()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    refreshInstances()
  }, [currentOrg])

  return (
    <TenantContext.Provider
      value={{
        organizations,
        instances,
        currentOrg,
        currentInstance,
        setCurrentOrg,
        setCurrentInstance,
        refreshOrganizations,
        refreshInstances
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}