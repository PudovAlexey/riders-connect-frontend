import type { EventType, EventVisibility } from '../types'

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'meeting', label: 'Встреча' },
  { value: 'trip', label: 'Поездка' },
  { value: 'photosession', label: 'Фотосессия' },
]

export function typeLabel(type: EventType): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type
}

export function visibilityLabel(v: EventVisibility): string {
  return v === 'public' ? 'Открытый' : 'Приватный'
}

// e.g. "Sat, Jul 1 · 13:00"
export function formatEventDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

// ISO string -> value for <input type="datetime-local"> (local time, no seconds/tz).
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// <input type="datetime-local"> value (local time) -> RFC3339 / ISO for the backend.
export function fromDateTimeLocal(local: string): string {
  return new Date(local).toISOString()
}
