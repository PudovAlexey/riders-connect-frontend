import { useMemo, useState } from 'react'
import BottomSheet from './BottomSheet'
import { type Endpoint, type EndpointTarget, type PlaceGroup, type PlaceItem, endpointLabel } from '../lib/routePlanner'

interface RoutePlannerProps {
  open: boolean
  onClose: () => void
  from: Endpoint
  to: Endpoint | null
  setEndpoint: (target: EndpointTarget, e: Endpoint) => void
  onSwap: () => void
  places: PlaceItem[]
  /** Currently opened POI, offered as a quick "selected point" option. */
  selected: { name: string; pos: [number, number] } | null
  onPickOnMap: (target: EndpointTarget) => void
  onBuild: () => void
  building: boolean
  error: string
}

const GROUP_LABEL: Record<PlaceGroup, string> = { poi: 'Точки', rider: 'Райдеры', event: 'Эвенты' }
const GROUP_ORDER: PlaceGroup[] = ['poi', 'rider', 'event']

function GroupIcon({ group }: { group: PlaceGroup }) {
  const path =
    group === 'rider'
      ? '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>'
      : group === 'event'
        ? '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>'
        : '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'
  return (
    <span
      className="w-5 h-5 flex-shrink-0 text-slate-400"
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${path}</svg>`,
      }}
    />
  )
}

export default function RoutePlanner({
  open, onClose, from, to, setEndpoint, onSwap, places, selected, onPickOnMap, onBuild, building, error,
}: RoutePlannerProps) {
  const [editing, setEditing] = useState<EndpointTarget | null>(null)
  const [listFor, setListFor] = useState<EndpointTarget | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? places.filter((p) => p.name.toLowerCase().includes(q)) : places
  }, [places, query])

  const pick = (target: EndpointTarget, e: Endpoint) => {
    setEndpoint(target, e)
    setEditing(null)
    setListFor(null)
    setQuery('')
  }

  // ── List sub-screen ──────────────────────────────────────────────────────
  if (listFor) {
    return (
      <BottomSheet open={open} onClose={onClose}>
        <div className="px-4 pb-8 pt-1">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setListFor(null); setQuery('') }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 active:bg-slate-100 flex-shrink-0"
              aria-label="Назад"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <p className="text-base font-bold text-slate-900">
              Точка «{listFor === 'from' ? 'Откуда' : 'Куда'}»
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="px-1 py-6 text-sm text-slate-400 text-center">Ничего не найдено</p>
          ) : (
            GROUP_ORDER.map((g) => {
              const items = filtered.filter((p) => p.group === g)
              if (!items.length) return null
              return (
                <div key={g}>
                  <p className="px-1 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">{GROUP_LABEL[g]}</p>
                  {items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pick(listFor, { kind: 'place', name: p.name, pos: p.pos, group: p.group })}
                      className="w-full flex items-center gap-3 px-1 py-2.5 border-b border-slate-50 active:bg-slate-50 text-left"
                    >
                      <GroupIcon group={p.group} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </BottomSheet>
    )
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  const Row = ({ target, value, dot, letter }: { target: EndpointTarget; value: Endpoint | null; dot: string; letter: string }) => {
    const isEditing = editing === target
    return (
      <div className="rounded-xl bg-slate-100 overflow-hidden">
        <button
          onClick={() => setEditing(isEditing ? null : target)}
          className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-slate-200/60 transition-colors"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: dot }}>{letter}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-400">{target === 'from' ? 'Откуда' : 'Куда'}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{endpointLabel(value)}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${isEditing ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isEditing && (
          <div className="px-3 pb-3 pt-0 flex flex-col gap-1.5">
            <Opt onClick={() => pick(target, { kind: 'me' })}>Моё местоположение</Opt>
            {selected && (
              <Opt onClick={() => pick(target, { kind: 'place', name: selected.name, pos: selected.pos, group: 'poi' })}>
                Выбранная: {selected.name}
              </Opt>
            )}
            <Opt onClick={() => { setEditing(null); onPickOnMap(target) }}>Точка на карте</Opt>
            <Opt onClick={() => { setListFor(target); setQuery('') }}>Из списка</Opt>
          </div>
        )}
      </div>
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pb-8 pt-1">
        <p className="text-lg font-bold text-slate-900 mb-3">Маршрут</p>

        <div className="flex flex-col gap-2">
          <Row target="from" value={from} dot="#16a34a" letter="A" />
          <div className="flex justify-center -my-3.5 relative z-10">
            <button
              onClick={onSwap}
              className="w-8 h-8 rounded-full bg-surface border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 active:bg-slate-100"
              title="Поменять местами"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rotate-90"><path d="m17 3 4 4-4 4" /><path d="M21 7H7" /><path d="m7 21-4-4 4-4" /><path d="M3 17h14" /></svg>
            </button>
          </div>
          <Row target="to" value={to} dot="#f97316" letter="B" />
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <button
          onClick={onBuild}
          disabled={!to || building}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm active:opacity-80 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>
          {building ? 'Строим маршрут…' : 'Построить маршрут'}
        </button>
      </div>
    </BottomSheet>
  )
}

function Opt({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg bg-surface text-sm text-slate-700 active:bg-slate-100 transition-colors"
    >
      {children}
    </button>
  )
}
