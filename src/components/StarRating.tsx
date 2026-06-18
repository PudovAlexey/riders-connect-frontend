import { useState } from 'react'

interface StarRatingProps {
  /** Current rating. Fractional values render partially-filled stars in display mode. */
  value: number
  /** When provided, the component is interactive and reports an integer 1–5 on click. */
  onChange?: (value: number) => void
  /** Star size in pixels. Default 18. */
  size?: number
  className?: string
}

const STAR_PATH =
  'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z'

function Star({ fill, size }: { fill: number; size: number }) {
  // fill is 0..1 — how much of this star is amber. Rendered as a gray base star
  // with an amber copy clipped to `fill` width on top.
  const clamped = Math.max(0, Math.min(1, fill))
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-slate-300 fill-current">
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${clamped * 100}%` }}>
        <svg viewBox="0 0 24 24" width={size} height={size} className="text-amber-400 fill-current">
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  )
}

export default function StarRating({ value, onChange, size = 18, className = '' }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const interactive = !!onChange
  const shown = hover ?? value

  if (!interactive) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${className}`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} fill={shown - i} size={size} />
        ))}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange!(n)}
          onMouseEnter={() => setHover(n)}
          className="active:scale-90 transition-transform"
          aria-label={`${n}`}
        >
          <Star fill={shown - (n - 1)} size={size} />
        </button>
      ))}
    </span>
  )
}
