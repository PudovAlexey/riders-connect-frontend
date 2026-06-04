import { useState } from 'react'
import type { CreateEventInput } from '../api'
import type { EventType, EventVisibility, RideEvent } from '../types'
import { EVENT_TYPES, fromDateTimeLocal, toDateTimeLocal } from '../lib/events'
import LocationPicker from './LocationPicker'

interface EventFormProps {
  initial?: RideEvent
  onSubmit: (payload: CreateEventInput) => Promise<void>
  onCancel: () => void
}

export default function EventForm({ initial, onSubmit, onCancel }: EventFormProps) {
  const isEdit = !!initial
  const [type, setType] = useState<EventType>(initial?.type ?? 'meeting')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dt, setDt] = useState(initial ? toDateTimeLocal(initial.starts_at) : '')
  const [visibility, setVisibility] = useState<EventVisibility>(initial?.visibility ?? 'private')
  const initialDest = initial?.details?.destination
  const [dest, setDest] = useState<{ lat: number; lon: number } | null>(
    initialDest ? { lat: initialDest.lat, lon: initialDest.lon } : null,
  )
  const [address, setAddress] = useState(initialDest?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const valid = title.trim() !== '' && dt !== '' && (type !== 'trip' || dest !== null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        type,
        title: title.trim(),
        description: description.trim(),
        starts_at: fromDateTimeLocal(dt),
        visibility,
        details:
          type === 'trip' && dest
            ? { destination: { lat: dest.lat, lon: dest.lon, address: address.trim() } }
            : {},
      })
    } catch {
      setError('Could not save event')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-[440px] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="px-4 pt-5 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <p className="text-lg font-bold text-slate-900">{isEdit ? 'Edit event' : 'New event'}</p>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-8 space-y-3 flex-1">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <div className="flex gap-2">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      type === t.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekend ride"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details…"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Date & time */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date & time *</label>
              <input
                type="datetime-local"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Visibility</label>
              <div className="flex gap-2">
                {(['public', 'private'] as EventVisibility[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      visibility === v ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {v === 'public' ? 'Public' : 'Private'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {visibility === 'public'
                  ? 'Visible to everyone in the feed.'
                  : 'Only invited participants can see it.'}
              </p>
            </div>

            {/* Trip destination */}
            {type === 'trip' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">
                  Destination * <span className="font-normal text-slate-400">— tap the map</span>
                </label>
                <LocationPicker value={dest} onChange={setDest} height={200} />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address or place name"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {dest && (
                  <p className="text-xs text-slate-400">
                    {dest.lat.toFixed(5)}, {dest.lon.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={!valid || saving}
                className="flex-1 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 transition-opacity"
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3.5 font-semibold text-sm active:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
