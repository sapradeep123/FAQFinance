import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { useToast } from '../../hooks/use-toast'

interface RequireAdminProps {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const location = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive'
      })
    }
  }, [isAuthenticated, user, toast])

  if (!isAuthenticated || !user) {
    // Redirect to login page with return url
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (user.role !== 'admin') {
    // Redirect non-admin users to dashboard
    return <Navigate to="/app/chat" replace />
  }

  return <>{children}</>
}