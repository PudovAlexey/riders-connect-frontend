import { NavLink } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  /** Outline icon — shown when the tab is inactive. */
  icon: React.ReactNode
  /** Solid icon — shown when the tab is active. */
  activeIcon: React.ReactNode
}

const tabs: Tab[] = [
  {
    to: '/map',
    label: 'Map',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M14.486 4.139a1 1 0 00-.83-.052l-5.6 2.16-4.21-1.685A1 1 0 002.5 5.49v12.05a1 1 0 00.629.928l5 2a1 1 0 00.728.005l5.6-2.16 4.21 1.685A1 1 0 0021.5 18.51V6.46a1 1 0 00-.629-.928l-5-2a1 1 0 00-.385-.062zM9 7.177l5-1.929v11.575l-5 1.929V7.177z" />
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 3C6.477 3 2 6.91 2 11.73c0 1.86.66 3.58 1.78 5L2.5 20.4a.6.6 0 00.77.74l4.04-1.45c1.42.62 3.02.97 4.69.97 5.523 0 10-3.91 10-8.73C22 6.91 17.523 3 12 3zM8 13a1.25 1.25 0 110-2.5A1.25 1.25 0 018 13zm4 0a1.25 1.25 0 110-2.5A1.25 1.25 0 0112 13zm4 0a1.25 1.25 0 110-2.5A1.25 1.25 0 0116 13z" />
      </svg>
    ),
  },
  {
    to: '/events',
    label: 'Events',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M8 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v2h18V6a2 2 0 00-2-2h-2V3a1 1 0 10-2 0v1H9V3a1 1 0 00-1-1zM3 10v9a2 2 0 002 2h14a2 2 0 002-2v-9H3z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM12 14c-4.418 0-8 2.91-8 6.5 0 .276.224.5.5.5h15a.5.5 0 00.5-.5c0-3.59-3.582-6.5-8-6.5z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[2000] flex justify-center">
      <div className="w-full max-w-[440px] bg-white border-t border-slate-100 flex pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? t.activeIcon : t.icon}
                <span className={`text-xs leading-none ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
