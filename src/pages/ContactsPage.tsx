import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContacts, addContact, deleteContact, createDirectChat } from '../api'
import type { Contact } from '../types'
import { initial } from '../lib/chat'

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [login, setLogin] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = () => getContacts().then((r) => setContacts(r.data))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = login.trim().replace(/^@/, '')
    if (!value) return
    setAdding(true)
    setError('')
    try {
      const res = await addContact(value)
      setContacts(res.data)
      setLogin('')
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'User not found' : 'Could not add contact')
    } finally {
      setAdding(false)
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

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-slate-100">
        <button onClick={() => navigate('/chat')} className="w-8 h-8 flex items-center justify-center text-slate-500 -ml-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Contacts</h1>
      </div>

      {/* Add by @login */}
      <form onSubmit={handleAdd} className="px-4 py-3 border-b border-slate-100 flex gap-2">
        <div className="flex-1 flex items-center gap-1 bg-slate-100 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-sm">@</span>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="login"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !login.trim()}
          className="bg-primary text-white text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="px-4 pt-2 text-sm text-red-500">{error}</p>}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">No contacts yet. Add someone by their @login.</p>
        ) : (
          contacts.map((c) => (
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
                title="Message"
                className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemove(c.id)}
                title="Remove"
                className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
