import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { useRole } from '@/hooks/useRole'

// Requires authentication
export function RequireAuth() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />
}

// Requires specific roles
export function RequireRole({ roles }: { roles: ('ADMIN' | 'RECEPTION' | 'CLIENT')[] }) {
  const { isAuthenticated } = useAuthStore()
  const { can } = useRole()

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (!can(roles)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// Guest-only views (e.g., booking portal)
export function RequireGuest() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
