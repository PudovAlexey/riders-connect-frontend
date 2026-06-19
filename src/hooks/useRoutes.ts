import { useCallback, useEffect, useState } from 'react'
import { getRoutes, getSuggestedRoutes } from '../api'
import type { Route } from '../types'

// The user's own saved routes.
export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    return getRoutes()
      .then((res) => setRoutes(res.data))
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { routes, loading, reload }
}

// Curated recommendation routes (empty until seeded on the backend). Kept as a
// separate hook so an empty/failed suggested list never affects the main list.
export function useSuggestedRoutes() {
  const [suggested, setSuggested] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    return getSuggestedRoutes()
      .then((res) => setSuggested(res.data))
      .catch(() => setSuggested([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { suggested, loading, reload }
}
