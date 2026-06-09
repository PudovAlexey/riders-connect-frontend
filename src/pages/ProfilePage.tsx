import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGarage } from '../hooks/useGarage'
import { isMuted, setMuted } from '../lib/sounds'
import { isPushSupported, getPushState, enablePush, disablePush } from '../lib/push'
import AppHeader from '../components/AppHeader'

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${
        on ? 'bg-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </span>
  )
}

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
  const { user, logout, promptLogin } = useAuth()
  const navigate = useNavigate()
  const { vehicles } = useGarage()
  const [copied, setCopied] = useState(false)
  const [soundOn, setSoundOn] = useState(!isMuted())
  const pushSupported = isPushSupported()
  const [pushOn, setPushOn] = useState(() => getPushState().enabled)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushHint, setPushHint] = useState('')

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setMuted(!next)
  }

  const togglePush = async () => {
    if (pushBusy) return
    setPushBusy(true)
    setPushHint('')
    try {
      if (!pushOn) {
        const perm = await enablePush()
        if (perm === 'granted') setPushOn(true)
        else if (perm === 'denied') setPushHint('Уведомления заблокированы в настройках браузера')
      } else {
        await disablePush()
        setPushOn(false)
      }
    } catch {
      setPushHint('Не удалось включить push')
    } finally {
      setPushBusy(false)
    }
  }

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

  const initial = (user.name || user.email || '?')[0].toUpperCase()

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <AppHeader
        title="Profile"
        actions={
          <button
            onClick={() => navigate('/profile/edit')}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors"
            aria-label="Edit profile"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-slate-600">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 px-4 py-4 space-y-3 pb-24">
        {/* User info card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-5">
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-slate-900 truncate">
                {user.name || 'No name'}
              </p>
              {user.username && <p className="text-sm text-primary mt-1 truncate">@{user.username}</p>}
              <p className="text-sm text-slate-500 mt-1 truncate">{user.email}</p>
            </div>
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-100">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{initial}</span>
              )}
            </div>
          </div>
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
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label="Edit profile"
            onClick={() => navigate('/profile/edit')}
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

        {/* Settings section */}
        <SectionCard title="Settings">
          <MenuRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            }
            label="Звук уведомлений"
            onClick={toggleSound}
            trailing={<Switch on={soundOn} />}
          />
          {pushSupported && (
            <MenuRow
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M4 4l16 16M9 4h6a2 2 0 012 2v6m-1.6 4H6a2 2 0 01-1.6-3.2L6 11V8" />
                </svg>
              }
              label="Push-уведомления"
              sublabel={pushHint || undefined}
              onClick={togglePush}
              trailing={<Switch on={pushOn} />}
            />
          )}
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
