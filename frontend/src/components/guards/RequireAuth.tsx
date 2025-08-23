import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  if (!isAuthenticated || !user) {
    // Redirect to login page with return url
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}