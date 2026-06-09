interface AppHeaderProps {
  /** Title text, or a custom node rendered in the title slot (e.g. chat avatar + name). */
  title?: React.ReactNode
  subtitle?: string
  /** When provided, a standard back button is shown on the left. */
  onBack?: () => void
  /** Right-side actions (page-specific buttons). */
  actions?: React.ReactNode
  /** Show a bottom hairline border. */
  border?: boolean
  /** Optional second row inside the white header (search field, scope tabs, …). */
  children?: React.ReactNode
}

export default function AppHeader({ title, subtitle, onBack, actions, border, children }: AppHeaderProps) {
  const titleIsNode = title != null && typeof title !== 'string' && typeof title !== 'number'

  return (
    <div className={`bg-surface px-2 pt-12 ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="h-14 flex items-center gap-1">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-slate-900">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {titleIsNode ? (
          <div className="flex-1 min-w-0">{title}</div>
        ) : (
          <div className={`flex-1 min-w-0 ${onBack ? '' : 'pl-2'}`}>
            {title != null && <h1 className="text-xl font-semibold text-slate-900 truncate leading-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
        )}

        {actions && <div className="ml-auto flex items-center gap-1 flex-shrink-0">{actions}</div>}
      </div>

      {children && <div className="px-2 pb-3">{children}</div>}
    </div>
  )
}
