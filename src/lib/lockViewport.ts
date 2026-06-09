/**
 * Prevents page-level pinch-zoom in iOS Safari.
 *
 * `maximum-scale=1, user-scalable=no` in the viewport meta is ignored by iOS
 * Safari for accessibility reasons, so we additionally cancel the Safari-only
 * `gesture*` events (which drive whole-page zoom). These are separate from the
 * touch events Leaflet uses for map pinch-zoom, so the map keeps working.
 * Double-tap zoom is already handled via `touch-action: manipulation` in CSS.
 */
export function lockViewport() {
  const prevent = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', prevent)
  document.addEventListener('gesturechange', prevent)
  document.addEventListener('gestureend', prevent)
}
