import type { ReactNode } from 'react'
import { useViewportHeight } from '../../hooks/useViewportHeight'

interface ChatLayoutProps {
  /** Top bar — first grid row, height by content. */
  header: ReactNode
  /** Scrollable message area — stretches to fill the remaining space. */
  children: ReactNode
  /** Pinned to the bottom (input bar / recording bar). Respects the iOS home bar. */
  footer: ReactNode
}

/**
 * Chat screen layout: header / messages / footer via CSS Grid.
 *
 * The root height tracks the visual viewport (keyboard-safe on iOS) and falls
 * back to `100dvh` (keyboard-safe on Android via
 * `interactive-widget=resizes-content`). The footer adds
 * `env(safe-area-inset-bottom)` so the input clears the iOS home indicator.
 *
 * The message row gets `1fr` + `minHeight: 0` so the chatscope `<MessageList>`
 * inside it can take all available space and own its scroll.
 */
export default function ChatLayout({ header, children, footer }: ChatLayoutProps) {
  const vh = useViewportHeight()

  const height = vh ? `${vh}px` : '100dvh'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        height,
        maxHeight: height,
        width: '100%',
        background: 'rgb(var(--c-bg))',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          height: '100%',
          width: '100%',
          maxWidth: 440,
          minWidth: 0,
          overflow: 'hidden',
          background: 'rgb(var(--c-surface))',
        }}
      >
        <div style={{ minWidth: 0, overflow: 'hidden' }}>{header}</div>

        <div style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}>{children}</div>

        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
            background: 'rgb(var(--c-surface))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}
