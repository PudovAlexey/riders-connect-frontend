import type { ReactNode } from 'react'
import { useVisualViewport } from '../../hooks/useViewportHeight'

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
 * The root is `position: fixed` and pinned to the *visual* viewport: its height
 * tracks `visualViewport.height` (so it shrinks under the iOS keyboard) and a
 * `translateY(offsetTop)` cancels the layout-viewport scroll iOS applies to
 * lift the focused input — without it the whole layout drifts off-screen.
 * Falls back to `100dvh` when `visualViewport` is unavailable (keyboard-safe on
 * Android via `interactive-widget=resizes-content`). The footer adds
 * `env(safe-area-inset-bottom)` so the input clears the iOS home indicator.
 *
 * The message row gets `1fr` + `minHeight: 0` so the chatscope `<MessageList>`
 * inside it can take all available space and own its scroll.
 */
export default function ChatLayout({ header, children, footer }: ChatLayoutProps) {
  const vv = useVisualViewport()

  const height = vv ? `${vv.height}px` : '100dvh'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        height,
        maxHeight: height,
        transform: vv ? `translateY(${vv.offsetTop}px)` : undefined,
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
