import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider } from './hooks/useAuth'
import AuthBottomSheet from './components/AuthBottomSheet'
import GlobalSounds from './components/GlobalSounds'
import ErrorBoundary from './components/ErrorBoundary'
import { routerConfig } from './router/routerConfig'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={routerConfig} />
          {/* Global login sheet — opened anywhere via useAuth().promptLogin() */}
          <AuthBottomSheet />
          {/* App-wide "message received" sound (must be inside AuthProvider) */}
          <GlobalSounds />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
