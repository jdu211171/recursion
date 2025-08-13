import { Navigate, useLocation } from 'react-router-dom'
import authService from '../services/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'ADMIN' | 'STAFF' | 'BORROWER'>
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = authService.isAuthenticated()
  const user = authService.getUser()

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User doesn't have the required role
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}