import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import AuthBottomSheet from './components/AuthBottomSheet'
import { routerConfig } from './router/routerConfig'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routerConfig} />
      {/* Global login sheet — opened anywhere via useAuth().promptLogin() */}
      <AuthBottomSheet />
    </AuthProvider>
  )
}
