// Road routing via OpenRouteService (free tier, API key).
//
// The key is read from VITE_ORS_API_KEY — put it in `.env.local`:
//   VITE_ORS_API_KEY=your-token   (get one at https://openrouteservice.org → Dashboard)
// Without a key the calls no-op (return null) instead of throwing.
//
// NOTE: this calls ORS directly from the browser, so the key ships to the
// client. For production, proxy through the backend to keep it secret.

const ORS_KEY: string = import.meta.env.VITE_ORS_API_KEY ?? ''

export type RouteProfile = 'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv'

export interface RouteResult {
  /** Route geometry as [lat, lon] points, ready for a Leaflet polyline. */
  coords: [number, number][]
  /** Total distance in meters. */
  distanceM: number
  /** Estimated duration in seconds. */
  durationS: number
}

/** Whether an ORS API key is configured. */
export function hasRoutingKey(): boolean {
  return ORS_KEY.length > 0
}

/**
 * Fetch a road route between two [lat, lon] points. Returns null when no key is
 * configured or the request fails (caller decides how to surface that).
 */
export async function getRoute(
  start: [number, number],
  end: [number, number],
  profile: RouteProfile = 'driving-car',
): Promise<RouteResult | null> {
  if (!ORS_KEY) {
    console.warn('[routing] VITE_ORS_API_KEY is not set — skipping route request')
    return null
  }
  const [slat, slon] = start
  const [elat, elon] = end
  // ORS expects lon,lat order. The GET endpoint returns GeoJSON.
  const url =
    `https://api.openrouteservice.org/v2/directions/${profile}` +
    `?api_key=${ORS_KEY}&start=${slon},${slat}&end=${elon},${elat}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/geo+json' } })
    if (!res.ok) return null
    const data = await res.json()
    const feat = data?.features?.[0]
    const line = feat?.geometry?.coordinates as [number, number][] | undefined
    if (!line?.length) return null
    return {
      coords: line.map(([lon, lat]) => [lat, lon] as [number, number]),
      distanceM: feat.properties?.summary?.distance ?? 0,
      durationS: feat.properties?.summary?.duration ?? 0,
    }
  } catch {
    return null
  }
}

/** "850 m" / "12.4 km" / "120 km" */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(m < 100_000 ? 1 : 0)} km`
}

/** "18 min" / "1 h 20 min" */
export function formatDuration(s: number): string {
  const min = Math.round(s / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
