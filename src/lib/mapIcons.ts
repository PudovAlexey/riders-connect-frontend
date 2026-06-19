// Leaflet pin factory for route waypoints. Mirrors endpointIcon/pinIcon used in
// MapPage / LocationPicker. Pure (no React) so HMR fast-refresh stays happy.
import L from 'leaflet'

/** Brand-colored teardrop pin with a waypoint number, anchored at the tip. */
export function numberedWaypointIcon(n: number, color = '#f97316') {
  const html = `<div style="position:relative;width:28px;height:38px">
      <div style="position:absolute;left:0;top:0;width:28px;height:28px;background:${color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.4)"></div>
      <div style="position:absolute;left:0;top:5px;width:28px;text-align:center;color:white;font-weight:700;font-size:13px;font-family:-apple-system,sans-serif">${n}</div>
    </div>`
  return L.divIcon({ className: '', html, iconSize: [28, 38], iconAnchor: [14, 37] })
}
