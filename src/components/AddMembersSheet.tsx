import { useEffect, useState } from 'react'
import { getContacts, searchUsers, addChatMember } from '../api'
import type { Chat, Contact, User } from '../types'
import { initial } from '../lib/chat'
import BottomSheet from './BottomSheet'

type Person = { id: string; username: string; name: string; avatar_url: string }

interface AddMembersSheetProps {
  open: boolean
  chat: Chat
  onClose: () => void
  onAdded: (updated: Chat) => void
}

/**
 * Bottom sheet to add people to an existing group chat. Reuses the search +
 * contacts multi-select pattern from NewChatPage; already-present members are
 * filtered out so they can't be added twice.
 */
export default function AddMembersSheet({ open, chat, onClose, onAdded }: AddMembersSheetProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<Person[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    getContacts().then((r) => setContacts(r.data)).catch(() => {})
  }, [open])

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

  const existing = new Set(chat.members.map((m) => m.user_id))

  const contactPeople: Person[] = contacts
    .filter((c) => !existing.has(c.contact_user_id))
    .map((c) => ({ id: c.contact_user_id, username: c.username, name: c.name, avatar_url: c.avatar_url }))
  const resultPeople: Person[] = results
    .filter((u) => !existing.has(u.id))
    .map((u) => ({ id: u.id, username: u.username, name: u.name, avatar_url: u.avatar_url }))
  // Show search results when typing, otherwise the contact list.
  const people = query.trim() ? resultPeople : contactPeople

  const toggle = (p: Person) => {
    setSelected((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p],
    )
  }

  const reset = () => {
    setSelected([])
    setQuery('')
    setResults([])
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const add = async () => {
    if (selected.length < 1) return
    setBusy(true)
    setError('')
    try {
      let updated: Chat | undefined
      // Each add returns the chat with its full member list; keep the latest.
      for (const p of selected) {
        const res = await addChatMember(chat.id, { user_id: p.id })
        updated = res.data
      }
      if (updated) onAdded(updated)
      reset()
      onClose()
    } catch {
      setError('Could not add members')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={close}>
      <div className="flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-900">Add members</p>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {selected.map((p) => (
              <span key={p.id} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                {p.name || `@${p.username}`}
              </span>
            ))}
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
              {query.trim() ? 'No users found' : 'No contacts to add — search by @login above'}
            </p>
          ) : (
            people.map((p) => {
              const isSel = selected.some((x) => x.id === p.id)
              return (
                <button
                  key={p.id}
                  disabled={busy}
                  onClick={() => toggle(p)}
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
            })
          )}
        </div>

        {/* Add button */}
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={add}
            disabled={busy || selected.length < 1}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
          >
            Add{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
