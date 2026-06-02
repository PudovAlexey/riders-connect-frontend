import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Gates nested routes behind a token; remembers the target so login can return to it. */
export function RequireAuth() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/auth" replace state={{ from: location }} />
  return <Outlet />
}

/** Keeps authenticated users off /auth, sending them back where they came from (or the map). */
export function GuestOnly() {
  const { token } = useAuth()
  const location = useLocation()
  if (token) {
    const state = location.state as { from?: { pathname?: string } } | null
    return <Navigate to={state?.from?.pathname ?? '/map'} replace />
  }
  return <Outlet />
}
