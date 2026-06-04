import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  getEvent,
  updateEvent,
  deleteEvent,
  respondToEvent,
  inviteToEvent,
  removeEventParticipant,
  searchUsers,
  type CreateEventInput,
} from '../api'
import EventForm from '../components/EventForm'
import LocationPicker from '../components/LocationPicker'
import { formatEventDate, typeLabel } from '../lib/events'
import { initial } from '../lib/chat'
import type { EventItem, ParticipantStatus, User } from '../types'
import AppHeader from '../components/AppHeader'

const STATUS_STYLE: Record<ParticipantStatus, string> = {
  pending: 'bg-amber-100 text-amber-600',
  accepted: 'bg-green-100 text-green-600',
  declined: 'bg-slate-200 text-slate-500',
}

export default function EventDetailPage() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const { user, token, promptLogin } = useAuth()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])

  const load = useCallback(() => {
    setLoading(true)
    getEvent(eventId)
      .then((r) => { setEvent(r.data); setErrorStatus(null) })
      .catch((err) => setErrorStatus(axios.isAxiosError(err) ? err.response?.status ?? 0 : 0))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    if (token) load()
    else setLoading(false)
  }, [token, load])

  // Debounced @login search for the invite box
  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    const t = setTimeout(() => {
      searchUsers(q).then((r) => setResults(r.data)).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const respond = async (status: 'accepted' | 'declined') => {
    setBusy(true)
    try { await respondToEvent(eventId, status); load() } finally { setBusy(false) }
  }

  const handleEdit = async (payload: CreateEventInput) => {
    await updateEvent(eventId, payload)
    setShowEdit(false)
    load()
  }

  const handleDelete = async () => {
    setBusy(true)
    try { await deleteEvent(eventId); navigate('/events') } finally { setBusy(false) }
  }

  const leave = async () => {
    if (!user) return
    setBusy(true)
    try { await removeEventParticipant(eventId, user.id); navigate('/events') } finally { setBusy(false) }
  }

  const invite = async (u: User) => {
    setBusy(true)
    setQuery('')
    setResults([])
    try { await inviteToEvent(eventId, { user_id: u.id }); load() } finally { setBusy(false) }
  }

  // --- Render states ---
  if (!token) {
    return (
      <Shell onBack={() => navigate('/events')}>
        <Centered>
          <p className="text-base font-semibold text-slate-900">Sign in to view this event</p>
          <button onClick={promptLogin} className="text-sm text-primary font-medium mt-2">Sign in</button>
        </Centered>
      </Shell>
    )
  }
  if (loading) {
    return (
      <Shell onBack={() => navigate('/events')}>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </Shell>
    )
  }
  if (errorStatus || !event) {
    const msg = errorStatus === 404 ? 'Event not found' : errorStatus === 403 ? 'This event is private' : 'Could not load event'
    return (
      <Shell onBack={() => navigate('/events')}>
        <Centered><p className="text-base font-semibold text-slate-900">{msg}</p></Centered>
      </Shell>
    )
  }

  const isOwner = event.owner_id === user?.id
  const amAccepted = isOwner || event.my_status === 'accepted'
  const dest = event.details?.destination

  return (
    <Shell onBack={() => navigate('/events')}>
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">{typeLabel(event.type)}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {event.visibility === 'public' ? 'Public' : 'Private'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{event.title || 'Untitled'}</h1>
          <p className="text-sm text-slate-500 mt-1">{formatEventDate(event.starts_at)}</p>
          {event.description && (
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">{event.description}</p>
          )}
        </div>

        {/* Trip destination */}
        {event.type === 'trip' && dest && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</p>
            <LocationPicker value={{ lat: dest.lat, lon: dest.lon }} readOnly height={180} />
            {dest.address && <p className="text-sm text-slate-600">📍 {dest.address}</p>}
          </div>
        )}

        {/* Pending invitation actions */}
        {event.my_status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => respond('accepted')} disabled={busy}
              className="flex-1 bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40">Accept</button>
            <button onClick={() => respond('declined')} disabled={busy}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold text-sm active:bg-slate-200">Decline</button>
          </div>
        )}

        {/* Participants */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Participants ({event.participants.length})
          </p>
          <div className="space-y-3">
            {event.participants.map((p) => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-indigo-500 font-semibold text-sm">{initial(p.name || p.username)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name || `@${p.username}`}</p>
                  {p.username && <p className="text-xs text-slate-400 truncate">@{p.username}</p>}
                </div>
                {p.role === 'owner' ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Owner</span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite (any accepted participant can invite) */}
        {amAccepted && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Invite people</p>
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
              <span className="text-slate-400 text-sm">@</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by login or name..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 divide-y divide-slate-50">
                {results.filter((u) => u.id !== user?.id).map((u) => (
                  <button key={u.id} disabled={busy} onClick={() => invite(u)}
                    className="w-full flex items-center gap-3 py-2.5 text-left active:bg-slate-50 disabled:opacity-50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-indigo-500 font-semibold text-xs">{initial(u.name || u.username)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{u.name || `@${u.username}`}</p>
                      {u.username && <p className="text-xs text-slate-400 truncate">@{u.username}</p>}
                    </div>
                    <span className="text-xs text-primary font-medium">Invite</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Owner / participant management */}
        {isOwner ? (
          <div className="flex gap-2">
            <button onClick={() => setShowEdit(true)}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold text-sm active:bg-slate-200">Edit</button>
            {confirmDelete ? (
              <button onClick={handleDelete} disabled={busy}
                className="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold text-sm active:bg-red-600 disabled:opacity-40">Confirm delete</button>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex-1 bg-slate-100 text-red-500 rounded-xl py-3 font-semibold text-sm active:bg-slate-200">Delete</button>
            )}
          </div>
        ) : (
          event.my_status === 'accepted' && (
            <button onClick={leave} disabled={busy}
              className="w-full bg-slate-100 text-red-500 rounded-xl py-3 font-semibold text-sm active:bg-slate-200 disabled:opacity-40">Leave event</button>
          )
        )}
      </div>

      {showEdit && <EventForm initial={event} onSubmit={handleEdit} onCancel={() => setShowEdit(false)} />}
    </Shell>
  )
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader onBack={onBack} title="Event" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-20 text-center">{children}</div>
}
