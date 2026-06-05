import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useWebSocket from 'react-use-websocket'
import { getUsersOnMap, getPoints, createDirectChat } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import type { UserLocation, Point } from '../types'
import BottomSheet from '../components/BottomSheet'
import { buildWsUrl } from '../lib/config'
import { POINT_CATEGORIES, categoryMeta, categorySvg, createCategoryIcon } from '../lib/pointCategories'

// Fix Leaflet default icon in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const myIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;background:#f97316;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function createAvatarIcon(name: string, avatarUrl: string, isOnline: boolean) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const inner = avatarUrl
    ? `<img src="${avatarUrl}" style="width:38px;height:38px;border-radius:50%;border:2.5px solid white;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:block">`
    : `<div style="width:38px;height:38px;background:#6366f1;border-radius:50%;border:2.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${initial}</div>`
  const badge = isOnline
    ? `<span style="position:absolute;bottom:0;right:0;width:11px;height:11px;background:#22c55e;border-radius:50%;border:2px solid white"></span>`
    : ''
  const html = `<div style="position:relative;width:38px;height:38px">${inner}${badge}</div>`
  return L.divIcon({ className: '', html, iconSize: [38, 38], iconAnchor: [19, 19] })
}

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(pos, 13, { duration: 1.2 }) }, [pos, map])
  return null
}

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

  const startChat = async (userId: string) => {
    try {
      const res = await createDirectChat({ user_id: userId })
      navigate(`/chat/${res.data.id}`)
    } catch { /* ignore */ }
  }

  return (
    <div className="relative h-screen">
      <MapContainer
        center={myPos ?? center}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {myPos && !flyToRef.current && <FlyTo pos={myPos} />}

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
      </MapContainer>

      {/* Filter button */}
      <button
        onClick={() => setFilterOpen(true)}
        className="absolute top-4 left-4 z-[1000] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:bg-slate-50 transition-colors"
        title="Filter"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Locate me button */}
      <button
        onClick={locateMe}
        className="absolute bottom-20 right-4 z-[1000] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:bg-slate-50 transition-colors"
        title="My location"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
      </button>

      {/* Online badge — real-time via WS */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow text-xs text-slate-600">
        {onlineCount} rider{onlineCount !== 1 ? 's' : ''} online
      </div>

      {/* Filter sheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="px-4 pb-8 pt-1 max-h-[75vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-2">
            {POINT_CATEGORIES.map((c) => {
              const sel = selectedCategories.has(c.key)
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCategory(c.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                    sel ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: categorySvg(c.key, 20) }} />
                  <span className="leading-tight">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Point detail sheet */}
      <BottomSheet open={!!activePoint} onClose={() => setActivePoint(null)}>
        {activePoint && (
          <div className="px-4 pb-8 pt-1 max-h-[80vh] overflow-y-auto">
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
    </div>
  )
}
