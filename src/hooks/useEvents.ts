import { useCallback, useEffect, useState } from 'react'
import { getEvents } from '../api'
import type { RideEvent } from '../types'

export type EventScope = 'feed' | 'mine' | 'invitations'

export function useEvents(scope: EventScope) {
  const [events, setEvents] = useState<RideEvent[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    return getEvents(scope)
      .then((res) => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => {
    reload()
  }, [reload])

  return { events, loading, reload }
}
