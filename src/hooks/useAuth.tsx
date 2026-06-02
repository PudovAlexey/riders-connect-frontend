import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getMe } from '../api'
import type { User } from '../types'

interface AuthCtx {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
  /** Whether the login bottom sheet is currently open */
  authOpen: boolean
  /** Open the login bottom sheet (used wherever an action requires auth) */
  promptLogin: () => void
  /** Close the login bottom sheet */
  closeAuth: () => void
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!token) { setIsLoading(false); return }
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem('token'); setToken(null) })
      .finally(() => setIsLoading(false))
  }, [token])

  const login = (tok: string, u: User) => {
    localStorage.setItem('token', tok)
    setToken(tok)
    setUser(u)
    setAuthOpen(false)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const promptLogin = () => setAuthOpen(true)
  const closeAuth = () => setAuthOpen(false)

  return (
    <Ctx.Provider
      value={{ user, token, isLoading, login, logout, updateUser: setUser, authOpen, promptLogin, closeAuth }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
