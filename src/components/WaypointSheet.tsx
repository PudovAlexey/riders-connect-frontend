import { useEffect, useState } from 'react'
import { getPoint } from '../api'
import { yandexRouteUrl, dgisRouteUrl, googleRouteUrl } from '../lib/externalMaps'
import type { Point, RoutePoint } from '../types'
import BottomSheet from './BottomSheet'
import PointReviews from './PointReviews'

interface Props {
  open: boolean
  onClose: () => void
  /** The tapped waypoint (route.points[index]). */
  point: RoutePoint | null
  index: number
  /** Linear progress cursor of the tracked route (see lib/routeProgress). */
  current: number
  /** route.points.length - 1. */
  lastIndex: number
  onSetCurrent: (index: number) => void
  /** Build an ORS route from my location to this waypoint. */
  onRouteHere: (name: string, pos: [number, number]) => void
  onToast?: (msg: string) => void
  onRequireAuth?: () => void
}

// Card for a route waypoint tapped on the tracked map. Mirrors the POI sheet
// (header + "Маршрут сюда" + external map links) and, when the waypoint points to
// a saved POI, shows its full details + reviews. Adds the linear-cursor tracking
// action ("проехали, едем дальше").
export default function WaypointSheet({
  open,
  onClose,
  point,
  index,
  current,
  lastIndex,
  onSetCurrent,
  onRouteHere,
  onToast,
  onRequireAuth,
}: Props) {
  const [poi, setPoi] = useState<Point | null>(null)
  const [loadingPoi, setLoadingPoi] = useState(false)

  // Enrich a POI-backed waypoint with its full record (description/photos/extra
  // info). Reviews load themselves from point_id, so they don't need this.
  useEffect(() => {
    setPoi(null)
    const id = point?.point_id
    if (!open || !id) return
    let cancelled = false
    setLoadingPoi(true)
    getPoint(id)
      .then((r) => { if (!cancelled) setPoi(r.data) })
      .catch(() => { /* deleted / unavailable — fall back to the stored waypoint */ })
      .finally(() => { if (!cancelled) setLoadingPoi(false) })
    return () => { cancelled = true }
  }, [open, point?.point_id])

  const isRidden = index < current
  const isCurrent = index === current
  const atFinish = isCurrent && index === lastIndex
  const badgeColor = isRidden ? '#9ca3af' : isCurrent ? '#f97316' : '#ef4444'
  const status = isRidden ? 'Проехали' : isCurrent ? 'Текущая точка' : 'Впереди'

  // Primary tracking action, consistent with the strip + grey/red map split.
  let action: { label: string; onClick: () => void; primary: boolean } | null = null
  if (index > current) action = { label: 'Доехал сюда', onClick: () => onSetCurrent(index), primary: true }
  else if (isCurrent && !atFinish) action = { label: 'Проехали, едем дальше →', onClick: () => onSetCurrent(index + 1), primary: true }
  else if (isRidden) action = { label: 'Вернуться сюда', onClick: () => onSetCurrent(index), primary: false }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {point && (
        <div className="px-4 pb-8 pt-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: badgeColor }}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 leading-tight truncate">{point.name || `Точка ${index + 1}`}</p>
              <p className="text-xs text-slate-500">{status}</p>
            </div>
          </div>

          {/* Tracking action */}
          {action ? (
            <button
              onClick={action.onClick}
              className={`w-full mb-3 rounded-xl py-3 font-semibold text-sm active:opacity-80 transition-opacity ${
                action.primary ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {action.label}
            </button>
          ) : (
            <div className="w-full mb-3 rounded-xl py-3 text-center bg-emerald-50 text-emerald-700 font-semibold text-sm">
              Финиш маршрута
            </div>
          )}

          {/* Маршрут сюда (ORS) */}
          <button
            onClick={() => onRouteHere(point.name || `Точка ${index + 1}`, [point.lat, point.lon])}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-xl py-2.5 font-medium text-sm active:bg-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Маршрут сюда
          </button>

          {/* External map links */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Яндекс', href: yandexRouteUrl(point.lat, point.lon) },
              { label: '2ГИС', href: dgisRouteUrl(point.lat, point.lon) },
              { label: 'Google', href: googleRouteUrl(point.lat, point.lon) },
            ].map((m) => (
              <a
                key={m.label}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 rounded-xl py-2.5 font-medium text-sm active:bg-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {m.label}
              </a>
            ))}
          </div>

          {/* Address + POI details */}
          <div className="space-y-2 text-sm">
            {(poi?.address || point.address) && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Адрес</span>
                <span className="text-slate-700">{poi?.address || point.address}</span>
              </div>
            )}
            {poi?.phone && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Телефон</span>
                <a href={`tel:${poi.phone}`} className="text-primary">{poi.phone}</a>
              </div>
            )}
            {poi?.website && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Сайт</span>
                <a href={poi.website} target="_blank" rel="noreferrer" className="text-primary truncate">{poi.website}</a>
              </div>
            )}
            {poi?.hours && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-16 shrink-0">Часы</span>
                <span className="text-slate-700">{poi.hours}</span>
              </div>
            )}
          </div>

          {poi?.description && (
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{poi.description}</p>
          )}

          {poi?.photos && poi.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {poi.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
              ))}
            </div>
          )}

          {loadingPoi && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {/* Reviews (POI-backed waypoints only) — mounted only while open. */}
          {open && point.point_id && (
            <PointReviews
              pointId={point.point_id}
              fallbackAvg={poi?.avg_rating}
              fallbackCount={poi?.review_count}
              onToast={onToast}
              onRequireAuth={onRequireAuth}
            />
          )}
        </div>
      )}
    </BottomSheet>
  )
}
