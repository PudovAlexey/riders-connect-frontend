import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Allows the nested routes only when a token is present, otherwise sends to /auth. */
export function RequireAuth() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  return <Outlet />
}

/** Keeps already authenticated users away from /auth by sending them to the app. */
export function GuestOnly() {
  const { token } = useAuth()
  if (token) return <Navigate to="/map" replace />
  return <Outlet />
}
