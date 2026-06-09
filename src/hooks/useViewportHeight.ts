import { useEffect, useState } from 'react'

/**
 * Tracks the visual viewport height in pixels.
 *
 * On iOS Safari/PWA the *layout* viewport does NOT shrink when the on-screen
 * keyboard opens (so `100vh`/`100dvh` stay full-height and the keyboard simply
 * covers whatever is pinned to the bottom). The *visual* viewport, however,
 * does shrink — so binding a full-screen container's height to
 * `window.visualViewport.height` keeps the input bar above the keyboard.
 *
 * Returns `null` when `visualViewport` is unavailable, letting the caller fall
 * back to a CSS `100dvh` height (good enough on Android with
 * `interactive-widget=resizes-content`).
 */
export function useViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.height : null,
  )

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => setHeight(vv.height)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return height
}
