import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContacts, addContact, deleteContact, searchUsers, createDirectChat } from '../api'
import type { Contact, User } from '../types'
import { initial } from '../lib/chat'
import AppHeader from '../components/AppHeader'

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () => getContacts().then((r) => setContacts(r.data))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  // Debounced search by name or @login
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

  const q = query.trim().replace(/^@/, '').toLowerCase()
  const contactIds = new Set(contacts.map((c) => c.contact_user_id))
  // Already-saved contacts matching the query (Telegram-style "Contacts" block).
  const matchedContacts = q
    ? contacts.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q),
      )
    : contacts
  // Found users that aren't contacts yet ("Global search" block).
  const otherUsers = results.filter((u) => !contactIds.has(u.id))

  const handleAddUser = async (u: User) => {
    setAddingId(u.id)
    setError('')
    try {
      const res = await addContact(u.username)
      setContacts(res.data)
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Пользователь не найден' : 'Не удалось добавить контакт')
    } finally {
      setAddingId(null)
    }
  }

  const handleRemove = async (id: string) => {
    await deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const startChat = async (userId: string) => {
    try {
      const res = await createDirectChat({ user_id: userId })
      navigate(`/chat/${res.data.id}`)
    } catch { /* ignore */ }
  }

  const renderContactRow = (c: Contact) => (
    <div key={c.id} className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50">
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {c.avatar_url ? (
          <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-indigo-500 font-semibold">{initial(c.name || c.username)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{c.name || `@${c.username}`}</p>
        {c.username && <p className="text-slate-400 text-xs truncate">@{c.username}</p>}
      </div>
      <button
        onClick={() => startChat(c.contact_user_id)}
        title="Написать"
        className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </button>
      <button
        onClick={() => handleRemove(c.id)}
        title="Убрать"
        className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
      </button>
    </div>
  )

  const renderUserRow = (u: User) => (
    <button
      key={u.id}
      disabled={addingId === u.id}
      onClick={() => handleAddUser(u)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-indigo-500 font-semibold">{initial(u.name || u.username)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{u.name || `@${u.username}`}</p>
        {u.username && <p className="text-slate-400 text-xs truncate">@{u.username}</p>}
      </div>
      <span className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
        {addingId === u.id ? (
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </span>
    </button>
  )

  const searching = query.trim().length > 0

  return (
    <div className="flex flex-col h-screen bg-surface">
      <AppHeader border onBack={() => navigate('/chat')} title="Контакты">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-sm">@</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по логину или имени…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </AppHeader>
      {error && <p className="px-4 pt-2 text-sm text-red-500">{error}</p>}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !searching ? (
          contacts.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-400 text-center">Пока нет контактов. Найдите по имени или @логину.</p>
          ) : (
            contacts.map(renderContactRow)
          )
        ) : matchedContacts.length === 0 && otherUsers.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">Никого не найдено</p>
        ) : (
          <>
            {matchedContacts.length > 0 && (
              <>
                <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Контакты</p>
                {matchedContacts.map(renderContactRow)}
              </>
            )}
            {otherUsers.length > 0 && (
              <>
                <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Глобальный поиск</p>
                {otherUsers.map(renderUserRow)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
