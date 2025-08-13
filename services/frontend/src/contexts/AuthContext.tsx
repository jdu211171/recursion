import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface User { id: string; email: string; role: 'ADMIN' | 'STAFF' | 'BORROWER' }

interface AuthContextType {
  user: User | null
  setUser: (u: User | null) => void
}

const Ctx = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const value = useMemo(() => ({ user, setUser }), [user])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

