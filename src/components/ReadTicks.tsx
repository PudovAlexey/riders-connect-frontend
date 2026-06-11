/**
 * Telegram-style read ticks: a single check for "sent", a double check for
 * "read". Color is driven by `className` (via currentColor on the strokes).
 */
export default function ReadTicks({ read, className = '' }: { read: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 14 11"
      className={`inline-block ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 6 L4 9 L9 2.5" />
      {read && <path d="M6 9 L11 2.5" />}
    </svg>
  )
}
