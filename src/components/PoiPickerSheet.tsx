import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { getPoints } from '../api'
import { categoryMeta } from '../lib/pointCategories'
import type { Point } from '../types'

interface Bounds {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
}

interface PoiPickerSheetProps {
  open: boolean
  onClose: () => void
  bounds: Bounds | null
  onPick: (point: Point) => void
  /** Disable picking (e.g. the route already has the max number of points). */
  disabled?: boolean
}

// Lets the route builder add an existing point of interest as a waypoint. Loads
// the POIs in the current map viewport via the shared getPoints() endpoint.
export default function PoiPickerSheet({ open, onClose, bounds, onPick, disabled }: PoiPickerSheetProps) {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !bounds) return
    setLoading(true)
    getPoints(bounds)
      .then((r) => setPoints(r.data))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false))
  }, [open, bounds])

  return (
    <BottomSheet open={open} onClose={onClose} detent="full">
      <div className="px-4 pt-1 pb-2">
        <p className="text-lg font-bold text-slate-900">Добавить из точек</p>
        <p className="text-xs text-slate-400">Точки интереса в текущей области карты</p>
      </div>
      <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">
            В этой области нет точек. Подвиньте карту и попробуйте снова.
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {points.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 py-3 text-left active:bg-slate-50 disabled:opacity-40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name || categoryMeta(p.category).label}</p>
                  {p.address && <p className="text-xs text-slate-400 truncate">{p.address}</p>}
                </div>
                <span className="text-xs text-primary font-medium flex-shrink-0">Добавить</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
