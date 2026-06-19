// Per-route ride progress, stored locally (no backend). A route's progress is a
// single linear cursor `current` (0-based point index) = the point you've reached:
// points before it are ridden, the one at it is current, points after are ahead.
// Personal + works for shared "suggested" routes too. Lives in localStorage like
// the theme/sounds prefs; same-tab updates broadcast via a CustomEvent (the native
// `storage` event only fires in *other* tabs).

import { useCallback, useEffect, useState } from 'react'

const KEY = 'routeProgress'
const EVENT = 'routeprogress'

// The currently-tracked route id, kept separate from per-route progress so it
// survives bottom-nav tab switches (which drop the ?track= query param) and full
// reloads. The map restores tracking from here when the URL has no ?track=.
const ACTIVE_KEY = 'activeRoute'
const ACTIVE_EVENT = 'activeroute'

export interface RouteProgress {
  current: number
}

type Store = Record<string, RouteProgress>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private-mode failures */
  }
}

export function getProgress(routeId: string): RouteProgress {
  return { current: readStore()[routeId]?.current ?? 0 }
}

export function setProgress(routeId: string, current: number): void {
  const store = readStore()
  store[routeId] = { current: Math.max(0, current) }
  writeStore(store)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { routeId } }))
}

export function clearProgress(routeId: string): void {
  const store = readStore()
  delete store[routeId]
  writeStore(store)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { routeId } }))
}

/**
 * Read + write a route's progress cursor, staying in sync with localStorage and
 * with every other mounted consumer (card strip, detail page, tracked map).
 */
export function useRouteProgress(routeId: string) {
  const [current, setCurrentState] = useState<number>(() => getProgress(routeId).current)

  // Re-read when the route changes.
  useEffect(() => {
    setCurrentState(getProgress(routeId).current)
  }, [routeId])

  // Stay in sync with same-tab writes (CustomEvent) and cross-tab writes (storage).
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.routeId === routeId) setCurrentState(getProgress(routeId).current)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCurrentState(getProgress(routeId).current)
    }
    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [routeId])

  const setCurrent = useCallback(
    (next: number) => {
      const v = Math.max(0, next)
      setCurrentState(v) // optimistic; setProgress also broadcasts to others
      setProgress(routeId, v)
    },
    [routeId],
  )

  return { current, setCurrent }
}

// --- Active (currently-tracked) route -------------------------------------

export function getActiveRoute(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveRoute(routeId: string | null): void {
  try {
    if (routeId) localStorage.setItem(ACTIVE_KEY, routeId)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore quota / private-mode failures */
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_EVENT))
}

/** The currently-tracked route id, synced across mounted consumers. */
export function useActiveRoute(): string | null {
  const [activeRoute, setState] = useState<string | null>(() => getActiveRoute())

  useEffect(() => {
    const onChange = () => setState(getActiveRoute())
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_KEY) setState(getActiveRoute())
    }
    window.addEventListener(ACTIVE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ACTIVE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return activeRoute
}
