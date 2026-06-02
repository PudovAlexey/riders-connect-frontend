import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <Outlet />
}
