import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGarage } from '../hooks/useGarage'
import { updateMe } from '../api'

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-300 flex-shrink-0">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

interface MenuRowProps {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick?: () => void
  trailing?: React.ReactNode
  danger?: boolean
}

function MenuRow({ icon, label, sublabel, onClick, trailing, danger }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-0 border-slate-100 active:bg-slate-50 transition-colors text-left"
    >
      <span className={`flex-shrink-0 ${danger ? 'text-red-500' : 'text-slate-400'}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-slate-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{sublabel}</p>}
      </div>
      {trailing ?? (onClick && !danger ? <ChevronIcon /> : null)}
    </button>
  )
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {title && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
        </div>
      )}
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser, promptLogin } = useAuth()
  const navigate = useNavigate()
  const { vehicles } = useGarage()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [usernameInput, setUsernameInput] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-8 gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-orange-200">
          ?
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Your profile</h2>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your profile and settings</p>
        </div>
        <button
          onClick={promptLogin}
          className="w-full max-w-xs bg-primary text-white rounded-xl py-3.5 font-semibold text-base active:bg-primary-dark transition-colors"
        >
          Sign in
        </button>
      </div>
    )
  }

  const initial = (displayName || user.email || '?')[0].toUpperCase()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    const cleanUsername = usernameInput.trim().replace(/^@/, '').toLowerCase()
    if (cleanUsername && !/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
      setError('Login must be 3–32 chars: a–z, 0–9, _')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await updateMe({
        name: nameInput.trim(),
        avatar_url: user.avatar_url ?? '',
        ...(cleanUsername && cleanUsername !== username ? { username: cleanUsername } : {}),
      })
      updateUser(res.data)
      setDisplayName(res.data.name)
      setUsername(res.data.username)
      setEditing(false)
    } catch (err: any) {
      if (err?.response?.status === 409) setError('That login is already taken')
      else if (err?.response?.status === 400) setError('Invalid login')
      else setError('Could not save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setNameInput(displayName)
    setUsernameInput(username)
    setError('')
    setEditing(false)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Profile</h1>
        {!editing && (
          <button
            onClick={() => { setNameInput(displayName); setUsernameInput(username); setError(''); setEditing(true) }}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-slate-600">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 pb-24">
        {/* User info card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {editing ? (
            <form onSubmit={handleSave} className="px-4 py-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900 mb-1">Edit profile</p>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Display name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Login</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary">
                  <span className="text-slate-400 text-sm">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="login"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="flex-1 ml-1 text-slate-900 focus:outline-none text-sm bg-transparent"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Others can add you to chats by this login</p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || !nameInput.trim()}
                  className="flex-1 bg-primary text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 transition-opacity"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold text-sm active:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-slate-900 truncate">
                  {displayName || 'No name'}
                </p>
                {username && <p className="text-sm text-primary mt-0.5 truncate">@{username}</p>}
                <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md shadow-orange-100">
                {initial}
              </div>
            </div>
          )}
        </div>

        {/* Account section */}
        <SectionCard title="Account">
          <MenuRow
            icon={
              <svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ minWidth: 20 }}>
                <circle cx="12" cy="30" r="8" stroke="currentColor" strokeWidth="4" fill="none" />
                <circle cx="52" cy="30" r="8" stroke="currentColor" strokeWidth="4" fill="none" />
                <path d="M20 30 L28 18 L38 18 L44 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M28 18 L32 10 L42 10 L44 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M20 30 L14 22 L22 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            }
            label="My Garage"
            sublabel={
              vehicles.length > 0
                ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}`
                : undefined
            }
            onClick={() => navigate('/garage')}
          />
          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label="Edit profile"
            onClick={() => { setNameInput(displayName); setUsernameInput(username); setError(''); setEditing(true) }}
          />
          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            }
            label="Your ID"
            sublabel={user.id}
            onClick={handleCopyId}
            trailing={
              copied ? (
                <span className="text-xs font-medium text-green-500 flex-shrink-0">Copied!</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-300 flex-shrink-0">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )
            }
          />
        </SectionCard>

        {/* Logout section */}
        <SectionCard>
          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
            label="Log out"
            onClick={logout}
            danger
          />
        </SectionCard>
      </div>
    </div>
  )
}
