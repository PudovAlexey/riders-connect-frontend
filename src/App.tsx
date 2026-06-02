import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { routerConfig } from './router/routerConfig'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routerConfig} />
    </AuthProvider>
  )
}
