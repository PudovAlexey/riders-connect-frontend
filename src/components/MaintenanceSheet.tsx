import { useState } from 'react'
import { addServiceItem, deleteServiceItem, resetServiceItem, updateServiceItem } from '../api'
import type { ServiceItem, ServiceStatus, Vehicle } from '../types'
import { SERVICE_CATALOG, serviceLabel } from '../lib/serviceCatalog'
import BottomSheet from './BottomSheet'

interface MaintenanceSheetProps {
  open: boolean
  vehicle: Vehicle
  onClose: () => void
  /** Refresh the garage so recomputed remaining_km / status flow back in. */
  onChanged: () => Promise<unknown>
}

const STATUS_BAR: Record<ServiceStatus, string> = {
  ok: 'bg-emerald-500',
  soon: 'bg-amber-500',
  overdue: 'bg-red-500',
  untracked: 'bg-slate-300',
}

const STATUS_BADGE: Record<ServiceStatus, { label: string; cls: string } | null> = {
  ok: null,
  soon: { label: 'Due soon', cls: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-600' },
  untracked: null,
}

const km = (n: number) => n.toLocaleString('en-US')

/**
 * Per-vehicle maintenance manager. Lists tracked service items with a
 * fuel-gauge style progress bar (full = just done, empty = due), a Done button
 * that resets the counter to the current odometer, inline interval editing, and
 * an "add from catalog" mode. All computed fields (remaining_km / status) come
 * from the server; after any mutation we call onChanged() to refetch.
 */
export default function MaintenanceSheet({ open, vehicle, onClose, onChanged }: MaintenanceSheetProps) {
  const [mode, setMode] = useState<'list' | 'add'>('list')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setMode('list')
    setEditingId(null)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={close} detent="full">
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-900">Maintenance</p>
            <p className="text-xs text-slate-400">
              {vehicle.make} {vehicle.model} · {km(vehicle.mileage)} km
            </p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'list' ? (
          <ListView
            vehicle={vehicle}
            busy={busy}
            editingId={editingId}
            setEditingId={setEditingId}
            onReset={(item) => run(() => resetServiceItem(vehicle.id, item.id))}
            onSaveEdit={(item, title, intervalKm) =>
              run(() => updateServiceItem(vehicle.id, item.id, { title, interval_km: intervalKm })).then(() =>
                setEditingId(null),
              )
            }
            onDelete={(item) =>
              run(() => deleteServiceItem(vehicle.id, item.id)).then(() => setEditingId(null))
            }
            onAdd={() => setMode('add')}
          />
        ) : (
          <AddView
            vehicle={vehicle}
            busy={busy}
            onBack={() => setMode('list')}
            onAdd={async (items) => {
              await run(async () => {
                for (const it of items) {
                  await addServiceItem(vehicle.id, it)
                }
              })
              setMode('list')
            }}
          />
        )}
      </div>
    </BottomSheet>
  )
}

/* ---------------------------------- List ---------------------------------- */

interface ListViewProps {
  vehicle: Vehicle
  busy: boolean
  editingId: string | null
  setEditingId: (id: string | null) => void
  onReset: (item: ServiceItem) => void
  onSaveEdit: (item: ServiceItem, title: string, intervalKm: number) => void
  onDelete: (item: ServiceItem) => void
  onAdd: () => void
}

function ListView({ vehicle, busy, editingId, setEditingId, onReset, onSaveEdit, onDelete, onAdd }: ListViewProps) {
  const items = vehicle.service_items ?? []
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">
            Nothing tracked yet. Add oil, chain lube, brake pads and more to keep an eye on intervals.
          </p>
        ) : (
          items.map((item) => (
            <ServiceRow
              key={item.id}
              item={item}
              busy={busy}
              editing={editingId === item.id}
              onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
              onReset={() => onReset(item)}
              onSaveEdit={(title, intervalKm) => onSaveEdit(item, title, intervalKm)}
              onDelete={() => onDelete(item)}
            />
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={onAdd}
          disabled={busy}
          className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add item
        </button>
      </div>
    </>
  )
}

interface ServiceRowProps {
  item: ServiceItem
  busy: boolean
  editing: boolean
  onToggleEdit: () => void
  onReset: () => void
  onSaveEdit: (title: string, intervalKm: number) => void
  onDelete: () => void
}

function ServiceRow({ item, busy, editing, onToggleEdit, onReset, onSaveEdit, onDelete }: ServiceRowProps) {
  const [title, setTitle] = useState(item.title ?? '')
  const [interval, setInterval] = useState(String(item.interval_km))

  const pct =
    item.interval_km > 0 ? Math.max(0, Math.min(1, item.remaining_km / item.interval_km)) : 0
  const badge = STATUS_BADGE[item.status]
  const remainingText =
    item.remaining_km >= 0
      ? `${km(item.remaining_km)} km left`
      : `${km(-item.remaining_km)} km overdue`

  return (
    <div className="px-4 py-3 border-b border-slate-50">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 text-sm truncate">{serviceLabel(item)}</p>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          {/* Progress (fuel-gauge: full = just serviced, empty = due) */}
          <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${STATUS_BAR[item.status]}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {remainingText} · every {km(item.interval_km)} km
            {item.times_done > 0 ? ` · done ${item.times_done}×` : ''}
          </p>
        </div>

        <button
          onClick={onReset}
          disabled={busy}
          className="bg-primary text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 active:opacity-80"
        >
          Done
        </button>
        <button
          onClick={onToggleEdit}
          disabled={busy}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 active:bg-slate-100 disabled:opacity-40"
          aria-label="Edit"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      </div>

      {editing && (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={serviceLabel(item)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Interval (km)</label>
            <input
              type="number"
              inputMode="numeric"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onSaveEdit(title.trim(), Math.max(0, Number(interval) || 0))}
              disabled={busy || !Number(interval)}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="flex-1 bg-red-50 text-red-500 rounded-lg py-2 text-sm font-semibold active:bg-red-100 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------- Add ---------------------------------- */

interface AddViewProps {
  vehicle: Vehicle
  busy: boolean
  onBack: () => void
  onAdd: (items: { kind: string; title?: string; interval_km: number }[]) => void
}

function AddView({ vehicle, busy, onBack, onAdd }: AddViewProps) {
  // Kinds already tracked (hide them so the same parameter isn't added twice).
  const tracked = new Set((vehicle.service_items ?? []).map((i) => i.kind))
  const available = SERVICE_CATALOG.filter((c) => !tracked.has(c.kind))

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customTitle, setCustomTitle] = useState('')
  const [customKm, setCustomKm] = useState('')

  const toggle = (kind: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(kind) ? next.delete(kind) : next.add(kind)
      return next
    })

  const submit = () => {
    const items: { kind: string; title?: string; interval_km: number }[] = available
      .filter((c) => selected.has(c.kind))
      .map((c) => ({ kind: c.kind, interval_km: c.defaultKm }))
    const ck = Number(customKm)
    if (customTitle.trim() && ck > 0) {
      items.push({ kind: 'custom', title: customTitle.trim(), interval_km: Math.round(ck) })
    }
    if (items.length === 0) return
    onAdd(items)
  }

  const total = selected.size + (customTitle.trim() && Number(customKm) > 0 ? 1 : 0)

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-50">
        <button onClick={onBack} className="text-primary text-sm font-medium flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {available.map((c) => {
          const isSel = selected.has(c.kind)
          return (
            <button
              key={c.kind}
              onClick={() => toggle(c.kind)}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{c.label}</p>
                <p className="text-slate-400 text-xs">every {km(c.defaultKm)} km</p>
              </div>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSel ? 'bg-primary border-primary text-white' : 'border-slate-300'
                }`}
              >
                {isSel && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          )
        })}

        {/* Custom item */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Custom</p>
          <div className="flex gap-2">
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Name (e.g. Fork oil)"
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              inputMode="numeric"
              value={customKm}
              onChange={(e) => setCustomKm(e.target.value)}
              placeholder="km"
              className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={submit}
          disabled={busy || total === 0}
          className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
        >
          Add{total > 0 ? ` (${total})` : ''}
        </button>
      </div>
    </>
  )
}
