import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEvents, type EventScope } from '../hooks/useEvents'
import { createEvent, respondToEvent, type CreateEventInput } from '../api'
import EventForm from '../components/EventForm'
import { formatEventDate, typeLabel } from '../lib/events'
import type { RideEvent } from '../types'
import AppHeader from '../components/AppHeader'

const SCOPES: { value: EventScope; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'mine', label: 'Mine' },
  { value: 'invitations', label: 'Invitations' },
]

const EMPTY_TEXT: Record<EventScope, string> = {
  feed: 'No events yet',
  mine: 'You have no events',
  invitations: 'No invitations',
}

export default function EventsPage() {
  const navigate = useNavigate()
  const { token, promptLogin } = useAuth()
  const [scope, setScope] = useState<EventScope>('feed')
  const { events, loading, reload } = useEvents(scope)
  const [showForm, setShowForm] = useState(false)

  const openForm = () => {
    if (!token) {
      promptLogin()
      return
    }
    setShowForm(true)
  }

  const handleCreate = async (payload: CreateEventInput) => {
    const res = await createEvent(payload)
    setShowForm(false)
    navigate(`/events/${res.data.id}`)
  }

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await respondToEvent(id, status)
      reload()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader
        title="Events"
        actions={
          <button
            onClick={openForm}
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

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-1 text-center">
            <p className="text-base font-semibold text-slate-900">{EMPTY_TEXT[scope]}</p>
            {scope !== 'invitations' && (
              <button onClick={openForm} className="text-sm text-primary font-medium mt-2">
                Create an event
              </button>
            )}
          </div>
        ) : (
          events.map((e: RideEvent) => (
            <button
              key={e.id}
              onClick={() => navigate(`/events/${e.id}`)}
              className="w-full text-left bg-surface rounded-2xl shadow-sm p-4 active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {typeLabel(e.type)}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {e.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="font-bold text-slate-900">{e.title || 'Untitled'}</p>
              <p className="text-sm text-slate-500 mt-0.5">{formatEventDate(e.starts_at)}</p>
              {e.type === 'trip' && e.details?.destination?.address && (
                <p className="text-xs text-slate-400 mt-1 truncate">📍 {e.details.destination.address}</p>
              )}

              {scope === 'invitations' && (
                <div className="flex gap-2 mt-3">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => { ev.stopPropagation(); respond(e.id, 'accepted') }}
                    className="flex-1 text-center bg-primary text-white rounded-xl py-2 text-sm font-semibold active:opacity-80"
                  >
                    Accept
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => { ev.stopPropagation(); respond(e.id, 'declined') }}
                    className="flex-1 text-center bg-slate-100 text-slate-700 rounded-xl py-2 text-sm font-semibold active:bg-slate-200"
                  >
                    Decline
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <EventForm open={showForm} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
    </div>
  )
}
