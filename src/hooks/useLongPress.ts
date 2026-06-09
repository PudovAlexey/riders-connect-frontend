import { useCallback, useRef } from 'react'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE_PX = 10

/**
 * Detects a long press (touch hold or mouse hold) and fires `onLongPress`.
 * Cancels if the pointer moves beyond a small tolerance or is released early,
 * and suppresses the native context menu so the hold doesn't double-trigger.
 *
 * Returns handlers to spread onto the element you want to make long-pressable.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    start.current = null
  }, [])

  const begin = useCallback(
    (x: number, y: number) => {
      clear()
      fired.current = false
      start.current = { x, y }
      timer.current = setTimeout(() => {
        fired.current = true
        timer.current = null
        onLongPress()
      }, LONG_PRESS_MS)
    },
    [clear, onLongPress],
  )

  const moved = useCallback(
    (x: number, y: number) => {
      if (!start.current) return
      if (
        Math.abs(x - start.current.x) > MOVE_TOLERANCE_PX ||
        Math.abs(y - start.current.y) > MOVE_TOLERANCE_PX
      ) {
        clear()
      }
    },
    [clear],
  )

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      begin(t.clientX, t.clientY)
    },
    onTouchMove: (e: React.TouchEvent) => {
      const t = e.touches[0]
      moved(t.clientX, t.clientY)
    },
    onTouchEnd: clear,
    onMouseDown: (e: React.MouseEvent) => begin(e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => moved(e.clientX, e.clientY),
    onMouseUp: clear,
    onMouseLeave: clear,
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress the browser menu; on desktop, treat right-click as the trigger.
      e.preventDefault()
      if (!fired.current) onLongPress()
    },
  }
}
