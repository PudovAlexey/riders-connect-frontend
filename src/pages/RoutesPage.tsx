import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRoutes, useSuggestedRoutes } from '../hooks/useRoutes'
import { formatDistance, formatDuration } from '../lib/routing'
import { pointsLabel } from '../lib/routeFormat'
import { useRouteProgress, useActiveRoute } from '../lib/routeProgress'
import type { Route } from '../types'
import AppHeader from '../components/AppHeader'
import RouteProgressStrip from '../components/RouteProgressStrip'

type Scope = 'mine' | 'suggested'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'mine', label: 'Мои' },
  { value: 'suggested', label: 'Предложенные' },
]

export default function RoutesPage() {
  const navigate = useNavigate()
  const { token, promptLogin } = useAuth()
  const activeRoute = useActiveRoute()
  const [scope, setScope] = useState<Scope>('mine')
  const { routes, loading } = useRoutes()
  const { suggested, loading: suggestedLoading } = useSuggestedRoutes()

  const list = scope === 'mine' ? routes : suggested
  const isLoading = scope === 'mine' ? loading : suggestedLoading

  const create = () => {
    if (!token) {
      promptLogin()
      return
    }
    navigate('/routes/new')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader
        title="Маршруты"
        actions={
          <button
            onClick={create}
            className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white active:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        }
      >
        <div className="flex gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                scope === s.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </AppHeader>

      <div className="flex-1 px-4 py-4 space-y-3 pb-24">
        {!token && scope === 'mine' ? (
          <div className="flex flex-col items-center justify-center py-20 gap-1 text-center">
            <p className="text-base font-semibold text-slate-900">Войдите, чтобы видеть свои маршруты</p>
            <button onClick={promptLogin} className="text-sm text-primary font-medium mt-2">
              Войти
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-1 text-center">
            {scope === 'mine' ? (
              <>
                <p className="text-base font-semibold text-slate-900">Пока нет маршрутов</p>
                <button onClick={create} className="text-sm text-primary font-medium mt-2">
                  Создать маршрут
                </button>
              </>
            ) : (
              <p className="text-base font-semibold text-slate-900">
                Скоро здесь появятся рекомендованные маршруты
              </p>
            )}
          </div>
        ) : (
          list.map((r: Route) => (
            <RouteCard
              key={r.id}
              route={r}
              active={r.id === activeRoute}
              onOpen={() => navigate(`/routes/${r.id}`)}
              onTrack={() => navigate(`/map?track=${r.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// One route card: name/meta (taps through to the detail page) plus a progress
// strip and a map button that opens the route on the main map for tracking. When
// it's the currently-tracked route, it gets an orange border + breathing glow.
function RouteCard({ route, active, onOpen, onTrack }: { route: Route; active: boolean; onOpen: () => void; onTrack: () => void }) {
  const { current, setCurrent } = useRouteProgress(route.id)
  const n = route.points.length

  return (
    <div
      className={`bg-surface rounded-2xl shadow-sm p-4 border-2 transition-colors ${
        active ? 'border-primary mc-route-active' : 'border-transparent'
      }`}
    >
      <button onClick={onOpen} className="w-full text-left active:opacity-70 transition-opacity">
        <p className="font-bold text-slate-900">{route.name || 'Без названия'}</p>
        <p className="text-sm text-slate-500 mt-0.5">
          {pointsLabel(n)}
          {route.distance_m > 0 && ` · ${formatDistance(route.distance_m)}`}
          {route.duration_s > 0 && ` · ${formatDuration(route.duration_s)}`}
        </p>
        {route.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{route.description}</p>
        )}
      </button>

      {n >= 2 && (
        <div className="flex items-center gap-3 mt-3">
          <RouteProgressStrip count={n} current={current} onSelect={setCurrent} className="flex-1" />
          <button
            onClick={onTrack}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
              active ? 'bg-primary text-white active:opacity-80' : 'bg-slate-100 text-primary active:bg-slate-200'
            }`}
            title={active ? 'Открыть на карте (отслеживается)' : 'Показать на карте'}
            aria-label="Показать на карте"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
