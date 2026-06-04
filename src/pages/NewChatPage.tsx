import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContacts, searchUsers, createDirectChat, createGroupChat } from '../api'
import type { Contact, User } from '../types'
import { initial } from '../lib/chat'
import AppHeader from '../components/AppHeader'

type Mode = 'direct' | 'group'

type Person = { id: string; username: string; name: string; avatar_url: string }

export default function NewChatPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('direct')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<Person[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getContacts().then((r) => setContacts(r.data)).catch(() => {})
  }, [])

  // Debounced @login search
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      searchUsers(q).then((r) => setResults(r.data)).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const contactPeople: Person[] = contacts.map((c) => ({
    id: c.contact_user_id,
    username: c.username,
    name: c.name,
    avatar_url: c.avatar_url,
  }))
  const resultPeople: Person[] = results.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatar_url: u.avatar_url,
  }))
  // Show search results when typing, otherwise the contact list.
  const people = query.trim() ? resultPeople : contactPeople

  const startDirect = async (p: Person) => {
    setBusy(true)
    setError('')
    try {
      const res = await createDirectChat({ user_id: p.id })
      navigate(`/chat/${res.data.id}`)
    } catch {
      setError('Could not start chat')
      setBusy(false)
    }
  }

  const toggle = (p: Person) => {
    setSelected((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p],
    )
  }

  const createGroup = async () => {
    if (!title.trim() || selected.length < 1) return
    setBusy(true)
    setError('')
    try {
      const res = await createGroupChat({ title: title.trim(), member_ids: selected.map((p) => p.id) })
      navigate(`/chat/${res.data.id}`)
    } catch {
      setError('Could not create group')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <AppHeader border onBack={() => navigate('/chat')} title={`New ${mode === 'group' ? 'group' : 'chat'}`} />

      {/* Mode tabs */}
      <div className="flex px-4 pt-3 gap-2">
        {(['direct', 'group'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === m ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {m === 'direct' ? 'Direct' : 'Group'}
          </button>
        ))}
      </div>

      {mode === 'group' && (
        <div className="px-4 pt-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selected.map((p) => (
                <span key={p.id} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                  {p.name || `@${p.username}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-sm">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by login or name..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="px-4 text-sm text-red-500">{error}</p>}

      {/* People list */}
      <div className="flex-1 overflow-y-auto">
        {!query.trim() && (
          <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Contacts</p>
        )}
        {people.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">
            {query.trim() ? 'No users found' : 'No contacts yet — search by @login above'}
          </p>
        ) : (
          people.map((p) => {
            const isSel = selected.some((x) => x.id === p.id)
            return (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => (mode === 'group' ? toggle(p) : startDirect(p))}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-indigo-500 font-semibold">{initial(p.name || p.username)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{p.name || `@${p.username}`}</p>
                  {p.username && <p className="text-slate-400 text-xs truncate">@{p.username}</p>}
                </div>
                {mode === 'group' && (
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
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Group create button */}
      {mode === 'group' && (
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={createGroup}
            disabled={busy || !title.trim() || selected.length < 1}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
          >
            Create group ({selected.length})
          </button>
        </div>
      )}
    </div>
  )
}
