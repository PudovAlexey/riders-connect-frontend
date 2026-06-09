import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import AuthBottomSheet from './components/AuthBottomSheet'
import GlobalSounds from './components/GlobalSounds'
import { routerConfig } from './router/routerConfig'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routerConfig} />
      {/* Global login sheet — opened anywhere via useAuth().promptLogin() */}
      <AuthBottomSheet />
      {/* App-wide "message received" sound (must be inside AuthProvider) */}
      <GlobalSounds />
    </AuthProvider>
  )
}
