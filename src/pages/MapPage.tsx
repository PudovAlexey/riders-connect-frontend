import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useWebSocket from 'react-use-websocket'
import { getUsersOnMap, createDirectChat } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import type { UserLocation } from '../types'

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

export default function MapPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<UserLocation[]>([])
  const [myPos, setMyPos] = useState<[number, number] | null>(null)
  const [center] = useState<[number, number]>([55.75, 37.62])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [onlineCount, setOnlineCount] = useState(0)
  const flyToRef = useRef(false)

  const wsUrl = token
    ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token}`
    : null

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

        {/* My location */}
        {myPos && (
          <Marker position={myPos} icon={myIcon}>
            <Popup>
              <span className="font-medium text-slate-800">You</span>
            </Popup>
          </Marker>
        )}

        {/* Other users */}
        {locations
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
    </div>
  )
}
