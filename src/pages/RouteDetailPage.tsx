import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../hooks/useAuth'
import { getRouteById, deleteRoute } from '../api'
import { getRouteMulti, splitRouteByCursor, formatDistance, formatDuration } from '../lib/routing'
import { numberedWaypointIcon } from '../lib/mapIcons'
import { FitRoute } from '../lib/mapHelpers'
import { pointsLabel } from '../lib/routeFormat'
import { useRouteProgress } from '../lib/routeProgress'
import AppHeader from '../components/AppHeader'
import RouteProgressStrip from '../components/RouteProgressStrip'
import type { Route } from '../types'

export default function RouteDetailPage() {
  const { routeId = '' } = useParams()
  const navigate = useNavigate()
  const { user, token, promptLogin } = useAuth()

  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lineCoords, setLineCoords] = useState<[number, number][]>([])
  const [wayPoints, setWayPoints] = useState<number[]>([])
  const { current, setCurrent } = useRouteProgress(routeId)

  const load = useCallback(() => {
    setLoading(true)
    getRouteById(routeId)
      .then((r) => { setRoute(r.data); setErrorStatus(null) })
      .catch((err) => setErrorStatus(axios.isAxiosError(err) ? err.response?.status ?? 0 : 0))
      .finally(() => setLoading(false))
  }, [routeId])

  useEffect(() => {
    if (token) load()
    else setLoading(false)
  }, [token, load])

  // Geometry isn't persisted — fetch the road line for display, falling back to a
  // straight connector through the raw waypoints when ORS is unavailable.
  useEffect(() => {
    if (!route) return
    const coords = route.points.map((p) => [p.lat, p.lon] as [number, number])
    const identity = coords.map((_, i) => i)
    if (coords.length < 2) {
      setLineCoords(coords)
      setWayPoints(identity)
      return
    }
    let cancelled = false
    getRouteMulti(coords).then((res) => {
      if (cancelled) return
      if (res && res.coords.length) {
        setLineCoords(res.coords)
        setWayPoints(res.wayPoints.length ? res.wayPoints : identity)
      } else {
        // ORS unavailable: straight connector through the raw waypoints.
        setLineCoords(coords)
        setWayPoints(identity)
      }
    })
    return () => { cancelled = true }
  }, [route])

  const handleDelete = async () => {
    setBusy(true)
    try { await deleteRoute(routeId); navigate('/routes') } finally { setBusy(false) }
  }

  if (!token) {
    return (
      <Shell onBack={() => navigate('/routes')}>
        <Centered>
          <p className="text-base font-semibold text-slate-900">Войдите, чтобы открыть маршрут</p>
          <button onClick={promptLogin} className="text-sm text-primary font-medium mt-2">Войти</button>
        </Centered>
      </Shell>
    )
  }
  if (loading) {
    return (
      <Shell onBack={() => navigate('/routes')}>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </Shell>
    )
  }
  if (errorStatus || !route) {
    const msg = errorStatus === 404 ? 'Маршрут не найден' : errorStatus === 403 ? 'Этот маршрут приватный' : 'Не удалось загрузить маршрут'
    return (
      <Shell onBack={() => navigate('/routes')}>
        <Centered><p className="text-base font-semibold text-slate-900">{msg}</p></Centered>
      </Shell>
    )
  }

  const isOwner = route.owner_id === user?.id
  const center: [number, number] = route.points[0]
    ? [route.points[0].lat, route.points[0].lon]
    : [55.75, 37.62]
  const polyline = lineCoords.length >= 2 ? lineCoords : route.points.map((p) => [p.lat, p.lon] as [number, number])
  const polyWayPoints = wayPoints.length ? wayPoints : route.points.map((_, i) => i)
  const { ridden, ahead } = splitRouteByCursor(polyline, polyWayPoints, current)
  const pointColor = (i: number) => (i < current ? '#9ca3af' : i === current ? '#f97316' : '#ef4444')

  return (
    <Shell onBack={() => navigate('/routes')}>
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Map preview */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ height: 240 }}>
          <MapContainer center={center} zoom={12} className="h-full w-full" zoomControl={false} dragging scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            {ridden.length >= 2 && (
              <>
                <Polyline positions={ridden} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                <Polyline positions={ridden} pathOptions={{ color: '#9ca3af', weight: 5, opacity: 1 }} />
              </>
            )}
            {ahead.length >= 2 && (
              <>
                <Polyline positions={ahead} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                <Polyline positions={ahead} pathOptions={{ color: '#ef4444', weight: 5, opacity: 1 }} />
              </>
            )}
            {route.points.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lon]}
                icon={numberedWaypointIcon(i + 1, pointColor(i))}
                eventHandlers={{ click: () => setCurrent(i) }}
              />
            ))}
            <FitRoute coords={route.points.map((p) => [p.lat, p.lon] as [number, number])} />
          </MapContainer>
        </div>

        {/* Header card */}
        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <h1 className="text-xl font-bold text-slate-900">{route.name || 'Без названия'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pointsLabel(route.points.length)}
            {route.distance_m > 0 && ` · ${formatDistance(route.distance_m)}`}
            {route.duration_s > 0 && ` · ${formatDuration(route.duration_s)}`}
          </p>
          {route.description && (
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">{route.description}</p>
          )}
          {route.points.length >= 2 && (
            <RouteProgressStrip count={route.points.length} current={current} onSelect={setCurrent} className="mt-4" />
          )}
        </div>

        {/* Waypoints — tap to mark "reached here": everything before turns grey/struck. */}
        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Точки</p>
          <div className="space-y-1">
            {route.points.map((p, i) => {
              const isRidden = i < current
              const isCurrent = i === current
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="w-full flex items-center gap-3 text-left py-1.5 rounded-lg active:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      isRidden ? 'bg-slate-400' : isCurrent ? 'bg-primary' : 'bg-red-500'
                    }`}
                  >
                    {isRidden ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="w-3.5 h-3.5">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isRidden ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {p.name || `Точка ${i + 1}`}
                    </p>
                    {p.address && <p className="text-xs text-slate-400 truncate">{p.address}</p>}
                  </div>
                  {isCurrent && <span className="text-[11px] font-semibold text-primary flex-shrink-0">текущая</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Open the route on the main map for tracking. */}
        <button
          onClick={() => navigate(`/map?track=${route.id}`)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-semibold text-sm active:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          Показать на карте
        </button>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/routes/${route.id}/edit`)}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold text-sm active:bg-slate-200"
            >
              Изменить
            </button>
            {confirmDelete ? (
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold text-sm active:bg-red-600 disabled:opacity-40"
              >
                Подтвердить удаление
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 bg-slate-100 text-red-500 rounded-xl py-3 font-semibold text-sm active:bg-slate-200"
              >
                Удалить
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader onBack={onBack} title="Маршрут" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-20 text-center">{children}</div>
}
