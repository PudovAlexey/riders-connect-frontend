import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useWebSocket from 'react-use-websocket'
import { getUsersOnMap, getPoints, createDirectChat, getChats, sendMessage, getEvents } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { UserLocation, Point, Chat } from '../types'
import BottomSheet from '../components/BottomSheet'
import { buildWsUrl } from '../lib/config'
import { POINT_CATEGORIES, categoryMeta, categorySvg, createCategoryIcon } from '../lib/pointCategories'
import { getRoute, hasRoutingKey, formatDistance, formatDuration, type RouteResult } from '../lib/routing'
import { buildPointUrl } from '../lib/mapShare'
import { chatTitle, chatAvatarUrl, initial } from '../lib/chat'
import RoutePlanner from '../components/RoutePlanner'
import { type Endpoint, type PlaceItem, type EndpointTarget, endpointLabel } from '../lib/routePlanner'

// Fix Leaflet default icon in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Live-location marker: solid core + white ring + a soft pulsing halo
// (the .rc-loc* classes + keyframes live in index.css).
const myIcon = L.divIcon({
  className: '',
  html: '<div class="rc-loc"><span class="rc-loc-pulse"></span><span class="rc-loc-core"></span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function createAvatarIcon(name: string, avatarUrl: string, isOnline: boolean) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  // Colored status ring (green online / slate offline) → white separator → avatar.
  const ring = isOnline ? '#22c55e' : '#94a3b8'
  const inner = avatarUrl
    ? `<img src="${avatarUrl}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;display:block">`
    : `<div style="width:38px;height:38px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:15px">${initial}</div>`
  const html = `<div style="width:46px;height:46px;border-radius:50%;background:${ring};box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
      <div style="width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</div>
    </div>`
  return L.divIcon({ className: '', html, iconSize: [46, 46], iconAnchor: [23, 23] })
}

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(pos, 13, { duration: 1.2 }) }, [pos, map])
  return null
}

// Fit the map to the full route once it's computed.
function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length) map.fitBounds(coords, { padding: [60, 60] })
  }, [coords, map])
  return null
}

// Capture the next map click (used to drop a From/To pin in the route planner).
function MapClickPicker({ onPick }: { onPick: (pos: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

// Labeled teardrop pin for route endpoints (A = from, B = to).
function endpointIcon(color: string, label: string) {
  const html = `<div style="position:relative;width:30px;height:40px">
      <div style="position:absolute;left:0;top:0;width:30px;height:30px;background:${color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.4)"></div>
      <div style="position:absolute;left:0;top:6px;width:30px;text-align:center;color:white;font-weight:700;font-size:13px;font-family:-apple-system,sans-serif">${label}</div>
    </div>`
  return L.divIcon({ className: '', html, iconSize: [30, 40], iconAnchor: [15, 39] })
}
const fromIcon = endpointIcon('#16a34a', 'A')
const toIcon = endpointIcon('#f97316', 'B')

// `categories` semantics: null = all categories (omit filter), 'none' = nothing
// selected (show no points), string[] = the selected subset.
type CategoryParam = string[] | null | 'none'

// Loads points for the current map viewport, refetching (debounced) on pan/zoom
// and immediately whenever the selected categories change.
function ViewportPoints({ param, setPoints }: { param: CategoryParam; setPoints: (p: Point[]) => void }) {
  const map = useMap()
  const paramRef = useRef<CategoryParam>(param)
  paramRef.current = param
  const timerRef = useRef<number | undefined>(undefined)

  const load = useCallback(() => {
    const p = paramRef.current
    if (p === 'none') { setPoints([]); return }
    const b = map.getBounds()
    getPoints(
      { min_lat: b.getSouth(), max_lat: b.getNorth(), min_lon: b.getWest(), max_lon: b.getEast() },
      p ?? undefined,
    )
      .then((r) => setPoints(r.data))
      .catch(() => { /* ignore (e.g. unauthorized) */ })
  }, [map, setPoints])

  const schedule = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(load, 400)
  }, [load])

  useMapEvents({ moveend: schedule, zoomend: schedule })

  // Initial load + refetch on category-selection change
  useEffect(() => { load() }, [load, param])

  return null
}

export default function MapPage() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<UserLocation[]>([])
  const [myPos, setMyPos] = useState<[number, number] | null>(null)
  const [center] = useState<[number, number]>([55.75, 37.62])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [onlineCount, setOnlineCount] = useState(0)
  const flyToRef = useRef(false)

  // Points of interest
  const allKeys = useMemo(() => POINT_CATEGORIES.map((c) => c.key), [])
  const [points, setPoints] = useState<Point[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set(allKeys))
  const [showRiders, setShowRiders] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activePoint, setActivePoint] = useState<Point | null>(null)

  // Routing (ORS): a computed route from my location to a tapped point.
  const [route, setRoute] = useState<(RouteResult & { name: string }) | null>(null)
  const [routing, setRouting] = useState(false)
  const [routeError, setRouteError] = useState('')

  // Route planner (From/To, each pickable via my-location / map-tap / list).
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [from, setFrom] = useState<Endpoint>({ kind: 'me' })
  const [to, setTo] = useState<Endpoint | null>(null)
  const [picking, setPicking] = useState<EndpointTarget | null>(null)
  const [eventPlaces, setEventPlaces] = useState<PlaceItem[]>([])

  // Share / send-to-chat from the point-detail sheet.
  const [searchParams, setSearchParams] = useSearchParams()
  const [deepLinkPos, setDeepLinkPos] = useState<[number, number] | null>(null)
  const pendingPointId = useRef<string | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)
  const [shareToChatOpen, setShareToChatOpen] = useState(false)
  const [pointToShare, setPointToShare] = useState<Point | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [chatsLoading, setChatsLoading] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const categoryParam = useMemo<CategoryParam>(() => {
    if (selectedCategories.size === 0) return 'none'
    if (selectedCategories.size === allKeys.length) return null
    return Array.from(selectedCategories)
  }, [selectedCategories, allKeys])

  const toggleCategory = (key: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const selectAll = () => setSelectedCategories(new Set(allKeys))
  const clearAll = () => setSelectedCategories(new Set())

  const wsUrl = token ? buildWsUrl(`/ws?token=${token}`) : null

  const { sendJsonMessage, lastJsonMessage } = useWebSocket(wsUrl, {
    share: true,
    shouldReconnect: () => true,
  })

  // Seed initial map data via HTTP on mount
  useEffect(() => {
    getUsersOnMap().then((r) => setLocations(r.data)).catch(() => {})
  }, [])

  // Handle incoming WS messages
  useEffect(() => {
    if (!lastJsonMessage) return
    const msg = lastJsonMessage as any

    if (msg.type === 'location_update') {
      setLocations((prev) => {
        const filtered = prev.filter((l) => l.user_id !== msg.user_id)
        return [...filtered, {
          user_id: msg.user_id,
          lat: msg.lat,
          lon: msg.lon,
          updated_at: '',
          name: msg.name,
          avatar_url: msg.avatar_url,
        }]
      })
    } else if (msg.type === 'online_users') {
      const ids = msg.user_ids as string[]
      setOnlineIds(new Set(ids))
      setOnlineCount(ids.length)
    } else if (msg.type === 'user_online') {
      setOnlineIds((prev) => new Set([...prev, msg.user_id as string]))
      setOnlineCount((n) => n + 1)
    } else if (msg.type === 'user_offline') {
      setOnlineIds((prev) => { const s = new Set(prev); s.delete(msg.user_id as string); return s })
      setOnlineCount((n) => Math.max(0, n - 1))
    }
  }, [lastJsonMessage])

  const locateMe = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lon } = pos.coords
      setMyPos([lat, lon])
      sendJsonMessage({ type: 'update_location', lat, lon })
    })
  }

  // Locate on mount, fly to position only once
  useEffect(() => {
    locateMe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: /map?point=<id>&lat&lon — fly there, then open the point's sheet
  // once it loads into the viewport (no single-point API needed).
  useEffect(() => {
    const id = searchParams.get('point')
    const lat = Number(searchParams.get('lat'))
    const lon = Number(searchParams.get('lon'))
    if (id && Number.isFinite(lat) && Number.isFinite(lon)) {
      pendingPointId.current = id
      setDeepLinkPos([lat, lon])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Open the pending deep-linked point's sheet as soon as it appears in view.
  useEffect(() => {
    const id = pendingPointId.current
    if (!id) return
    const found = points.find((p) => p.id === id)
    if (found) {
      setActivePoint(found)
      pendingPointId.current = null
      setSearchParams({}, { replace: true })
    }
  }, [points, setSearchParams])

  const startChat = async (userId: string) => {
    try {
      const res = await createDirectChat({ user_id: userId })
      navigate(`/chat/${res.data.id}`)
    } catch { /* ignore */ }
  }

  // Resolve the current position (cached myPos, else a fresh geolocation read).
  const ensurePosition = (): Promise<[number, number] | null> =>
    new Promise((resolve) => {
      if (myPos) return resolve(myPos)
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setMyPos(p)
          sendJsonMessage({ type: 'update_location', lat: p[0], lon: p[1] })
          resolve(p)
        },
        () => resolve(null),
      )
    })

  const resolveEndpoint = (e: Endpoint): Promise<[number, number] | null> =>
    e.kind === 'me' ? ensurePosition() : Promise.resolve(e.pos)

  const endpointPos = (e: Endpoint | null): [number, number] | null =>
    e && e.kind !== 'me' ? e.pos : null

  const setEndpoint = (target: EndpointTarget, e: Endpoint) =>
    (target === 'from' ? setFrom(e) : setTo(e))

  const swapEndpoints = () => { setFrom(to ?? { kind: 'me' }); setTo(from) }

  const handlePickOnMap = (target: EndpointTarget) => {
    setPicking(target)
    setPlannerOpen(false) // close the sheet so the map is tappable
  }

  // Core: resolve both endpoints, fetch the ORS route, draw it.
  const runRoute = async (a: Endpoint, b: Endpoint, label: string): Promise<boolean> => {
    setRouting(true)
    setRouteError('')
    try {
      const start = await resolveEndpoint(a)
      if (!start) { setRouteError('Не удалось определить точку «Откуда»'); return false }
      const end = await resolveEndpoint(b)
      if (!end) { setRouteError('Не удалось определить точку «Куда»'); return false }
      const r = await getRoute(start, end, 'driving-car')
      if (!r) {
        setRouteError(hasRoutingKey() ? 'Не удалось построить маршрут' : 'Добавьте VITE_ORS_API_KEY в .env.local')
        return false
      }
      setRoute({ ...r, name: label })
      return true
    } finally {
      setRouting(false)
    }
  }

  const buildRouteAB = async () => {
    if (!to) return
    if (await runRoute(from, to, endpointLabel(to))) setPlannerOpen(false)
  }

  // Quick "Маршрут сюда" from a point's sheet: me → point, via the same path.
  const buildRoute = async (point: Point) => {
    const target: Endpoint = { kind: 'place', name: point.name, pos: [point.lat, point.lon], group: 'poi' }
    setFrom({ kind: 'me' })
    setTo(target)
    if (await runRoute({ kind: 'me' }, target, point.name)) setActivePoint(null)
  }

  // Selectable places for the planner list: viewport POI + riders + trip events.
  const places: PlaceItem[] = useMemo(() => {
    const poi = points.map((p): PlaceItem => ({
      id: `poi-${p.id}`, name: p.name, sub: categoryMeta(p.category).label, pos: [p.lat, p.lon], group: 'poi',
    }))
    const riders = locations
      .filter((l) => l.user_id !== user?.id)
      .map((l): PlaceItem => ({
        id: `rider-${l.user_id}`, name: l.name || 'Rider',
        sub: onlineIds.has(l.user_id) ? 'Райдер · онлайн' : 'Райдер', pos: [l.lat, l.lon], group: 'rider',
      }))
    return [...poi, ...riders, ...eventPlaces]
  }, [points, locations, user?.id, onlineIds, eventPlaces])

  // Lazily fetch trip events (the ones with coordinates) when the planner opens.
  useEffect(() => {
    if (!plannerOpen) return
    getEvents()
      .then((r) => setEventPlaces(
        r.data
          .filter((e) => e.type === 'trip' && e.details?.destination)
          .map((e): PlaceItem => ({
            id: `event-${e.id}`, name: e.title || 'Эвент', sub: 'Эвент',
            pos: [e.details.destination!.lat, e.details.destination!.lon], group: 'event',
          })),
      ))
      .catch(() => {})
  }, [plannerOpen])

  // Share a point's link via the native OS share sheet, falling back to clipboard.
  const sharePoint = async (p: Point) => {
    const url = buildPointUrl(p)
    const shareData = { title: p.name, text: p.address ? `${p.name} · ${p.address}` : p.name, url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast('Ссылка скопирована')
    } catch {
      showToast('Не удалось скопировать')
    }
  }

  // Swap the point-detail sheet for the chat picker (one sheet open at a time).
  const openChatPicker = (p: Point) => {
    setPointToShare(p)
    setActivePoint(null)
    setShareToChatOpen(true)
    setChatsLoading(true)
    getChats()
      .then((r) => setChats(r.data))
      .catch(() => {})
      .finally(() => setChatsLoading(false))
  }

  // Send the picked point into a chat (as a text message carrying its link) and
  // open that conversation so the user sees it land.
  const sendPointToChat = async (chat: Chat) => {
    if (!pointToShare) return
    try {
      await sendMessage(chat.id, buildPointUrl(pointToShare))
      setShareToChatOpen(false)
      navigate(`/chat/${chat.id}`)
    } catch {
      showToast('Не удалось отправить')
    }
  }

  return (
    <div className="relative h-screen">
      <MapContainer
        center={deepLinkPos ?? myPos ?? center}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={
            isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {deepLinkPos && <FlyTo pos={deepLinkPos} />}
        {myPos && !flyToRef.current && !deepLinkPos && <FlyTo pos={myPos} />}

        <ViewportPoints param={categoryParam} setPoints={setPoints} />

        {/* Points of interest */}
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={createCategoryIcon(p.category)}
            eventHandlers={{ click: () => setActivePoint(p) }}
          />
        ))}

        {/* My location */}
        {myPos && (
          <Marker position={myPos} icon={myIcon}>
            <Popup>
              <span className="font-medium text-slate-800">You</span>
            </Popup>
          </Marker>
        )}

        {/* Other riders */}
        {showRiders && locations
          .filter((l) => l.user_id !== user?.id)
          .map((l) => (
            <Marker
              key={l.user_id}
              position={[l.lat, l.lon]}
              icon={createAvatarIcon(l.name ?? '', l.avatar_url ?? '', onlineIds.has(l.user_id))}
            >
              <Popup>
                <div className="flex flex-col gap-2 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    {l.avatar_url ? (
                      <img
                        src={l.avatar_url}
                        alt={l.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {l.name ? l.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">
                        {l.name || 'Rider'}
                      </p>
                      <p style={{ color: onlineIds.has(l.user_id) ? '#22c55e' : '#94a3b8', fontSize: 11 }}>
                        {onlineIds.has(l.user_id) ? 'online' : 'offline'}
                      </p>
                    </div>
                  </div>
                  {token && (
                    <button
                      onClick={() => startChat(l.user_id)}
                      className="bg-primary text-white text-xs rounded-lg px-3 py-1.5 font-medium"
                    >
                      Start chat
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Route (white casing + orange line so it reads on both themes) */}
        {route && (
          <>
            <Polyline positions={route.coords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
            <Polyline positions={route.coords} pathOptions={{ color: '#f97316', weight: 5, opacity: 1 }} />
            <FitRoute coords={route.coords} />
          </>
        )}

        {/* Route endpoints (A/B) while planning or after building */}
        {(plannerOpen || route) && endpointPos(from) && (
          <Marker position={endpointPos(from)!} icon={fromIcon} />
        )}
        {(plannerOpen || route) && endpointPos(to) && (
          <Marker position={endpointPos(to)!} icon={toIcon} />
        )}

        {/* Map-tap pick mode (drop a From/To pin) */}
        {picking && (
          <MapClickPicker
            onPick={(pos) => { setEndpoint(picking, { kind: 'pin', pos }); setPicking(null); setPlannerOpen(true) }}
          />
        )}
      </MapContainer>

      {/* Filter button */}
      <button
        onClick={() => setFilterOpen(true)}
        className="absolute top-4 left-4 z-[1000] w-12 h-12 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary active:bg-slate-50 transition-colors"
        title="Filter"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Route planner button */}
      <button
        onClick={() => { setRouteError(''); setPlannerOpen(true) }}
        className="absolute top-[72px] left-4 z-[1000] w-12 h-12 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary active:bg-slate-50 transition-colors"
        title="Маршрут"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" />
        </svg>
      </button>

      {/* Locate me button */}
      <button
        onClick={locateMe}
        className="absolute bottom-20 right-4 z-[1000] w-12 h-12 bg-surface rounded-full shadow-lg flex items-center justify-center text-primary active:bg-slate-50 transition-colors"
        title="My location"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
      </button>

      {/* Online badge — real-time via WS (hidden while picking a point) */}
      {!picking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-surface/90 backdrop-blur px-3 py-1 rounded-full shadow text-xs text-slate-600">
          {onlineCount} rider{onlineCount !== 1 ? 's' : ''} online
        </div>
      )}

      {/* Pick-on-map hint */}
      {picking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 bg-surface rounded-full shadow-lg pl-4 pr-2 py-2 max-w-[90vw]">
          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
            Тапните карту — «{picking === 'from' ? 'Откуда' : 'Куда'}»
          </span>
          <button
            onClick={() => { setPicking(null); setPlannerOpen(true) }}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200 flex-shrink-0"
            title="Cancel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Route summary banner */}
      {route && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-surface rounded-full shadow-lg pl-4 pr-2 py-2 max-w-[90vw]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary flex-shrink-0">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
            {formatDistance(route.distanceM)} · {formatDuration(route.durationS)}
          </span>
          <span className="text-xs text-slate-400 truncate">→ {route.name}</span>
          <button
            onClick={() => setRoute(null)}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200 flex-shrink-0"
            title="Clear route"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filter sheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="px-4 pb-8 pt-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-bold text-slate-900">Map filters</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-primary">Select all</button>
              <button onClick={clearAll} className="text-xs font-medium text-slate-400">Clear</button>
            </div>
          </div>

          {/* Riders layer toggle */}
          <button
            onClick={() => setShowRiders((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-4 text-sm font-medium transition-colors ${
              showRiders ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>Motorcyclists</span>
            <span className={`text-xs ${showRiders ? 'text-white/80' : 'text-slate-400'}`}>
              {showRiders ? 'shown' : 'hidden'}
            </span>
          </button>

          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {POINT_CATEGORIES.map((c) => {
              const sel = selectedCategories.has(c.key)
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCategory(c.key)}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      sel ? 'text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                    style={sel ? { background: c.color } : undefined}
                    dangerouslySetInnerHTML={{ __html: categorySvg(c.key, 24) }}
                  />
                  <span
                    className={`text-[11px] leading-tight text-center ${
                      sel ? 'text-slate-900 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Point detail sheet */}
      <BottomSheet open={!!activePoint} onClose={() => setActivePoint(null)}>
        {activePoint && (
          <div className="px-4 pb-8 pt-1">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: categoryMeta(activePoint.category).color }}
                dangerouslySetInnerHTML={{ __html: categorySvg(activePoint.category, 22) }}
              />
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight truncate">{activePoint.name}</p>
                <p className="text-xs text-slate-500">{categoryMeta(activePoint.category).label}</p>
              </div>
            </div>

            <button
              onClick={() => buildRoute(activePoint)}
              disabled={routing}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-semibold text-sm active:opacity-80 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              {routing ? 'Строим маршрут…' : 'Маршрут сюда'}
            </button>
            {routeError && <p className="text-xs text-red-500 mb-3 -mt-1">{routeError}</p>}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => sharePoint(activePoint)}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-xl py-2.5 font-medium text-sm active:bg-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
                Поделиться
              </button>
              <button
                onClick={() => openChatPicker(activePoint)}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-xl py-2.5 font-medium text-sm active:bg-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                В чат
              </button>
            </div>

            {activePoint.description && (
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">{activePoint.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {activePoint.address && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Address</span>
                  <span className="text-slate-700">{activePoint.address}</span>
                </div>
              )}
              {activePoint.phone && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Phone</span>
                  <a href={`tel:${activePoint.phone}`} className="text-primary">{activePoint.phone}</a>
                </div>
              )}
              {activePoint.website && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Website</span>
                  <a href={activePoint.website} target="_blank" rel="noreferrer" className="text-primary truncate">
                    {activePoint.website}
                  </a>
                </div>
              )}
              {activePoint.hours && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Hours</span>
                  <span className="text-slate-700">{activePoint.hours}</span>
                </div>
              )}
            </div>

            {activePoint.photos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {activePoint.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Send-to-chat picker */}
      <BottomSheet open={shareToChatOpen} onClose={() => setShareToChatOpen(false)}>
        <div className="px-4 pb-8 pt-1">
          <p className="text-lg font-bold text-slate-900 mb-3">Отправить в чат</p>
          {chatsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Нет доступных чатов</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto -mx-4">
              {chats.map((c) => {
                const title = chatTitle(c, user?.id)
                const avatar = chatAvatarUrl(c, user?.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => sendPointToChat(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-indigo-500 font-semibold">{initial(title)}</span>
                      )}
                    </div>
                    <p className="font-medium text-slate-900 text-sm truncate">{title}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Route planner */}
      <RoutePlanner
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        from={from}
        to={to}
        setEndpoint={setEndpoint}
        onSwap={swapEndpoints}
        places={places}
        selected={activePoint ? { name: activePoint.name, pos: [activePoint.lat, activePoint.lon] } : null}
        onPickOnMap={handlePickOnMap}
        onBuild={buildRouteAB}
        building={routing}
        error={routeError}
      />

      {/* Transient toast (e.g. link copied) */}
      {toast && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1100] bg-slate-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
