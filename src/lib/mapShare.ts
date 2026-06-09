// Canonical "shareable point" link, used everywhere a map point leaves the map:
//   - native OS share sheet (navigator.share) on /map
//   - sent into a chat as a plain text message (kept backend-compatible)
//   - rendered back as a location card in chat + reopened on /map
//
// Encoding the point's display fields in the URL keeps the whole flow
// self-contained: no single-point API and no custom chat message_type needed.

import type { Point } from '../types'

export interface SharedPoint {
  id: string
  lat: number
  lon: number
  name: string
  category: string
  address: string
  /** In-app relative path (`/map?...`) for react-router navigation. */
  to: string
}

/** Absolute, shareable URL that reopens the given point on /map. */
export function buildPointUrl(p: Point): string {
  const params = new URLSearchParams({
    point: p.id,
    lat: String(p.lat),
    lon: String(p.lon),
    name: p.name,
    cat: p.category,
  })
  if (p.address) params.set('addr', p.address)
  return `${window.location.origin}/map?${params.toString()}`
}

/**
 * Parse a string that is (or contains) a shareable point link into its fields.
 * Returns null for anything that isn't a `/map` link carrying point+lat+lon.
 * Cheap and exception-safe — it runs in chat render and list previews.
 */
export function parsePointShare(text?: string): SharedPoint | null {
  if (!text) return null
  try {
    const u = new URL(text.trim())
    if (!u.pathname.endsWith('/map')) return null
    const id = u.searchParams.get('point')
    const lat = Number(u.searchParams.get('lat'))
    const lon = Number(u.searchParams.get('lon'))
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return {
      id,
      lat,
      lon,
      name: u.searchParams.get('name') || 'Точка на карте',
      category: u.searchParams.get('cat') || 'unknown',
      address: u.searchParams.get('addr') || '',
      to: `/map${u.search}`,
    }
  } catch {
    return null
  }
}
