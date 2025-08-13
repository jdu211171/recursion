import { useContext } from 'react'
import { TenantContext } from './TenantContext'

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}