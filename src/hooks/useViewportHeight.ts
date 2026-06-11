import { useEffect, useState } from 'react'

export interface VisualViewportMetrics {
  /** Visual viewport height in px (shrinks when the iOS keyboard opens). */
  height: number
  /** Vertical offset of the visual viewport inside the layout viewport. */
  offsetTop: number
}

function read(): VisualViewportMetrics | null {
  if (typeof window === 'undefined' || !window.visualViewport) return null
  return { height: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop }
}

/**
 * Tracks the visual viewport height and vertical offset.
 *
 * On iOS Safari/PWA the *layout* viewport does NOT shrink when the on-screen
 * keyboard opens (so `100vh`/`100dvh` stay full-height and the keyboard simply
 * covers whatever is pinned to the bottom). The *visual* viewport, however,
 * does shrink — so binding a full-screen container's height to
 * `window.visualViewport.height` keeps the input bar above the keyboard.
 *
 * iOS additionally scrolls the layout viewport to lift the focused input above
 * the keyboard, which surfaces as `visualViewport.offsetTop > 0`. Callers must
 * compensate that offset (e.g. `transform: translateY(offsetTop)` on a fixed
 * container) or the layout drifts off-screen.
 *
 * Returns `null` when `visualViewport` is unavailable, letting the caller fall
 * back to a CSS `100dvh` height (good enough on Android with
 * `interactive-widget=resizes-content`).
 */
export function useVisualViewport(): VisualViewportMetrics | null {
  const [metrics, setMetrics] = useState<VisualViewportMetrics | null>(read)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => setMetrics({ height: vv.height, offsetTop: vv.offsetTop })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return metrics
}
