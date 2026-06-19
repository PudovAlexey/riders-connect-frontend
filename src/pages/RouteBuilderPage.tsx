import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../hooks/useAuth'
import { getRouteById, createRoute, updateRoute } from '../api'
import { getRouteMulti, formatDistance, formatDuration, type RouteResult } from '../lib/routing'
import { numberedWaypointIcon } from '../lib/mapIcons'
import { MapClickPicker } from '../lib/mapHelpers'
import { pointsLabel } from '../lib/routeFormat'
import WaypointList from '../components/WaypointList'
import PoiPickerSheet from '../components/PoiPickerSheet'
import AppHeader from '../components/AppHeader'
import type { Point, RoutePoint } from '../types'

const DEFAULT_CENTER: [number, number] = [55.75, 37.62] // Moscow fallback
const MAX_POINTS = 10

interface Bounds {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
}

export default function RouteBuilderPage() {
  const { routeId } = useParams()
  const isEdit = !!routeId
  const navigate = useNavigate()
  const { token, promptLogin } = useAuth()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState<RoutePoint[]>([])
  const [routeLine, setRouteLine] = useState<RouteResult | null>(null)
  const [building, setBuilding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [center, setCenter] = useState<[number, number] | null>(null)
  const [ready, setReady] = useState(false)
  // Stored stats from the loaded route, so a name-only edit doesn't zero them out
  // when ORS is unavailable and never recomputes the line.
  const [savedStats, setSavedStats] = useState<{ distance: number; duration: number }>({ distance: 0, duration: 0 })

  const [poiOpen, setPoiOpen] = useState(false)
  const [bounds, setBounds] = useState<Bounds | null>(null)

  const mapRef = useRef<L.Map | null>(null)

  // Seed an existing route (edit) or resolve the user's position to frame the map (create).
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (isEdit && routeId) {
        try {
          const r = await getRouteById(routeId)
          if (cancelled) return
          setName(r.data.name)
          setDescription(r.data.description)
          setPoints(r.data.points)
          setSavedStats({ distance: r.data.distance_m, duration: r.data.duration_s })
          setCenter(r.data.points[0] ? [r.data.points[0].lat, r.data.points[0].lon] : DEFAULT_CENTER)
        } catch {
          if (!cancelled) {
            setError('Не удалось загрузить маршрут')
            setCenter(DEFAULT_CENTER)
          }
        } finally {
          if (!cancelled) setReady(true)
        }
        return
      }
      if (!navigator.geolocation) {
        setCenter(DEFAULT_CENTER)
        setReady(true)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) { setCenter([pos.coords.latitude, pos.coords.longitude]); setReady(true) } },
        () => { if (!cancelled) { setCenter(DEFAULT_CENTER); setReady(true) } },
        { timeout: 5000 },
      )
    }
    init()
    return () => { cancelled = true }
  }, [isEdit, routeId])

  // Live road route through the waypoints (debounced). Falls back to nothing when
  // <2 points or no ORS key — the map then draws a straight-line connector.
  const pointsKey = JSON.stringify(points.map((p) => [p.lat, p.lon]))
  useEffect(() => {
    const coords = points.map((p) => [p.lat, p.lon] as [number, number])
    if (coords.length < 2) {
      setRouteLine(null)
      setBuilding(false)
      return
    }
    let cancelled = false
    setBuilding(true)
    const t = setTimeout(async () => {
      const res = await getRouteMulti(coords)
      if (cancelled) return
      setRouteLine(res)
      setBuilding(false)
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey])

  const addPoint = (pos: [number, number]) => {
    setPoints((prev) =>
      prev.length >= MAX_POINTS ? prev : [...prev, { lat: pos[0], lon: pos[1], name: '', address: '' }],
    )
  }

  const addPoi = (p: Point) => {
    setPoints((prev) =>
      prev.length >= MAX_POINTS
        ? prev
        : [...prev, { lat: p.lat, lon: p.lon, name: p.name, address: p.address, point_id: p.id }],
    )
    setPoiOpen(false)
  }

  const rename = (index: number, value: string) =>
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, name: value } : p)))

  const remove = (index: number) => setPoints((prev) => prev.filter((_, i) => i !== index))

  const openPoi = () => {
    const m = mapRef.current
    if (m) {
      const b = m.getBounds()
      setBounds({ min_lat: b.getSouth(), max_lat: b.getNorth(), min_lon: b.getWest(), max_lon: b.getEast() })
    }
    setPoiOpen(true)
  }

  const valid = name.trim() !== '' && points.length >= 1

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      description: description.trim(),
      points,
      distance_m: routeLine?.distanceM ?? savedStats.distance,
      duration_s: routeLine?.durationS ?? savedStats.duration,
    }
    try {
      const res = isEdit && routeId ? await updateRoute(routeId, payload) : await createRoute(payload)
      navigate(`/routes/${res.data.id}`)
    } catch {
      setError('Не удалось сохранить маршрут')
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-100">
        <AppHeader onBack={() => navigate('/routes')} title="Маршрут" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-slate-900">Войдите, чтобы создавать маршруты</p>
          <button onClick={promptLogin} className="text-sm text-primary font-medium mt-2">Войти</button>
        </div>
      </div>
    )
  }

  const lineCoords: [number, number][] =
    routeLine?.coords ?? (points.length >= 2 ? points.map((p) => [p.lat, p.lon]) : [])

  const stats = building
    ? 'Строим маршрут…'
    : routeLine
      ? `${formatDistance(routeLine.distanceM)} · ${formatDuration(routeLine.durationS)}`
      : points.length >= 2
        ? 'Прямая линия (маршрут недоступен)'
        : '—'

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader
        onBack={() => navigate(-1)}
        title={isEdit ? 'Изменить маршрут' : 'Новый маршрут'}
        actions={
          <button
            onClick={save}
            disabled={!valid || saving}
            className="px-4 h-9 bg-primary rounded-full text-white text-sm font-semibold active:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? '…' : 'Сохранить'}
          </button>
        }
      />

      {/* Map */}
      {ready && center ? (
        <div style={{ height: '45vh' }} className="relative">
          <MapContainer ref={mapRef} center={center} zoom={12} className="h-full w-full" zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            <MapClickPicker onPick={addPoint} />
            {lineCoords.length >= 2 && (
              <>
                <Polyline positions={lineCoords} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                <Polyline positions={lineCoords} pathOptions={{ color: '#f97316', weight: 5, opacity: 1 }} />
              </>
            )}
            {points.map((p, i) => (
              <Marker key={i} position={[p.lat, p.lon]} icon={numberedWaypointIcon(i + 1)} />
            ))}
          </MapContainer>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-surface/95 rounded-full px-3 py-1 shadow text-xs text-slate-600 pointer-events-none">
            {points.length === 0 ? 'Нажмите на карту, чтобы добавить точку' : `${pointsLabel(points.length)} · ${stats}`}
          </div>
        </div>
      ) : (
        <div style={{ height: '45vh' }} className="flex items-center justify-center bg-slate-100">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Form */}
      <div className="flex-1 px-4 py-4 space-y-4 pb-10">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название маршрута"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание (необязательно)"
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Точки ({points.length}/{MAX_POINTS})
            </p>
            <button
              type="button"
              onClick={openPoi}
              disabled={points.length >= MAX_POINTS}
              className="text-sm text-primary font-medium disabled:opacity-40"
            >
              + Из точек
            </button>
          </div>

          {points.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              Добавьте точки нажатием на карту или из списка точек интереса.
            </p>
          ) : (
            <WaypointList points={points} onReorder={setPoints} onRename={rename} onRemove={remove} />
          )}

          {points.length >= MAX_POINTS && (
            <p className="text-xs text-amber-600 mt-2">Достигнут максимум — 10 точек.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <PoiPickerSheet
        open={poiOpen}
        onClose={() => setPoiOpen(false)}
        bounds={bounds}
        onPick={addPoi}
        disabled={points.length >= MAX_POINTS}
      />
    </div>
  )
}
