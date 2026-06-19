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
  /**
   * Indices into `coords`, one per input waypoint, marking where each waypoint
   * falls on the geometry (ORS `properties.way_points`). Lets callers split the
   * line at a given waypoint (e.g. ridden vs. ahead). Empty if ORS omitted it.
   */
  wayPoints: number[]
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
      wayPoints: feat.properties?.way_points ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Fetch a road route through an ordered list of [lat, lon] waypoints (2..N) in a
 * single ORS request. Unlike getRoute (2-point GET), this uses the POST geojson
 * endpoint with the key in the Authorization header. Returns null when no key is
 * configured, there are fewer than two points, or the request fails.
 */
export async function getRouteMulti(
  points: [number, number][],
  profile: RouteProfile = 'driving-car',
): Promise<RouteResult | null> {
  if (!ORS_KEY) {
    console.warn('[routing] VITE_ORS_API_KEY is not set — skipping route request')
    return null
  }
  if (points.length < 2) return null
  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: ORS_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json',
      },
      // ORS expects [lon, lat]; we store [lat, lon].
      body: JSON.stringify({ coordinates: points.map(([lat, lon]) => [lon, lat]) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const feat = data?.features?.[0]
    const line = feat?.geometry?.coordinates as [number, number][] | undefined
    if (!line?.length) return null
    return {
      coords: line.map(([lon, lat]) => [lat, lon] as [number, number]),
      distanceM: feat.properties?.summary?.distance ?? 0,
      durationS: feat.properties?.summary?.duration ?? 0,
      wayPoints: feat.properties?.way_points ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Split a route geometry at the given waypoint cursor into a "ridden" prefix and
 * an "ahead" suffix that share one overlapping coordinate (so the two polylines
 * join seamlessly). `current` is a 0-based waypoint index — everything up to and
 * including that waypoint is ridden, everything from it onward is ahead.
 *
 * `wayPoints` should map each waypoint to its index in `coords`. For a straight
 * connector (no ORS geometry) pass the identity `[0,1,…,N-1]` with `coords` set
 * to the raw waypoints.
 */
export function splitRouteByCursor(
  coords: [number, number][],
  wayPoints: number[],
  current: number,
): { ridden: [number, number][]; ahead: [number, number][] } {
  if (coords.length < 2) return { ridden: [], ahead: coords }
  const last = wayPoints.length - 1
  const c = last < 0 ? 0 : Math.max(0, Math.min(current, last))
  const idx = wayPoints[c] ?? 0
  return {
    ridden: coords.slice(0, idx + 1),
    ahead: coords.slice(idx),
  }
}

/** "850 м" / "12.4 км" / "120 км" */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} м`
  return `${(m / 1000).toFixed(m < 100_000 ? 1 : 0)} км`
}

/** "18 мин" / "1 ч 20 мин" */
export function formatDuration(s: number): string {
  const min = Math.round(s / 60)
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r ? `${h} ч ${r} мин` : `${h} ч`
}
