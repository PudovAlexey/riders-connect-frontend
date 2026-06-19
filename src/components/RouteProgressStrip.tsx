import { Fragment } from 'react'

interface Props {
  /** Number of route points. */
  count: number
  /** Linear cursor — index of the current point (see lib/routeProgress). */
  current: number
  /** Tap a dot to set it as the current point. Omit for a read-only strip. */
  onSelect?: (index: number) => void
  className?: string
}

// A row of dots — one per route point — connected by segments. Ridden points
// (index < current) show a grey check, the current point is a filled primary
// ring, points ahead are hollow slate. Tapping a dot moves the cursor there.
export default function RouteProgressStrip({ count, current, onSelect, className = '' }: Props) {
  if (count <= 0) return null
  return (
    <div className={`flex items-center ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const ridden = i < current
        const isCurrent = i === current
        // The leg leading into point i is ridden once you've reached point i.
        const legRidden = i <= current
        return (
          <Fragment key={i}>
            {i > 0 && (
              <div className={`h-0.5 flex-1 min-w-[6px] rounded ${legRidden ? 'bg-slate-400' : 'bg-slate-200'}`} />
            )}
            <button
              type="button"
              onClick={
                onSelect
                  ? (e) => {
                      e.stopPropagation()
                      onSelect(i)
                    }
                  : undefined
              }
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                ridden
                  ? 'bg-slate-400 text-white'
                  : isCurrent
                    ? 'bg-primary text-white ring-2 ring-primary/30'
                    : 'bg-slate-200 text-slate-500'
              }`}
              aria-label={`Точка ${i + 1}`}
              aria-current={isCurrent}
            >
              {ridden ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="w-2.5 h-2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
