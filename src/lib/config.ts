// Base URL for the backend API + WebSocket.
//
// In development these resolve to the current origin — Vite proxies /auth, /geo,
// /points, /ws, … to localhost:8080 (see vite.config.ts). In production, set
// VITE_API_URL at build time to the backend's public URL so the static frontend
// (served from a different domain) knows where the API lives.
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Build a ws(s):// URL for a backend path, honoring API_URL when set. */
export function buildWsUrl(path: string): string {
  const base = API_URL || `${location.protocol}//${location.host}`
  const u = new URL(base)
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${u.host}${path}`
}
