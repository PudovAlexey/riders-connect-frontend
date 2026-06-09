import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getInitialTheme, setStoredTheme, applyTheme, type Theme } from '../lib/theme'

interface ThemeCtx {
  theme: Theme
  isDark: boolean
  /** Flip between light and dark and persist the choice. */
  toggleTheme: () => void
  /** Set an explicit theme and persist it. */
  setTheme: (theme: Theme) => void
}

const Ctx = createContext<ThemeCtx>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Keep <html> in sync whenever the theme changes.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (next: Theme) => {
    setStoredTheme(next)
    setThemeState(next)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <Ctx.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
