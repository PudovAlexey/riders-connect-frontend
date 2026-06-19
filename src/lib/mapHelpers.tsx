// Small react-leaflet helper components for route maps, mirroring the same-named
// helpers in MapPage (kept here so the route pages can share them).
import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

/** Fit the map to the given coordinates whenever they change. */
export function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length === 1) {
      map.setView(coords[0], 13)
    } else if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50] })
    }
  }, [coords, map])
  return null
}

/** Capture map clicks and report the [lat, lon] of each. */
export function MapClickPicker({ onPick }: { onPick: (pos: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}
