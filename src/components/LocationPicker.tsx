import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [55.75, 37.62] // Moscow fallback

// Teardrop "drop a pin here" marker in the brand color, anchored at the tip.
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:30px;height:40px">
      <div style="position:absolute;left:0;top:0;width:30px;height:30px;background:#f97316;border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.4)"></div>
      <div style="position:absolute;left:11px;top:9px;width:8px;height:8px;border-radius:50%;background:white"></div>
    </div>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39],
})

interface LatLon {
  lat: number
  lon: number
}

interface LocationPickerProps {
  value?: LatLon | null
  onChange?: (p: LatLon) => void
  readOnly?: boolean
  height?: number
}

function ClickHandler({ onPick }: { onPick: (p: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

export default function LocationPicker({ value, onChange, readOnly = false, height = 220 }: LocationPickerProps) {
  // Resolve an initial center once before mounting the map so it frames correctly.
  const [center, setCenter] = useState<[number, number] | null>(
    value ? [value.lat, value.lon] : null,
  )

  useEffect(() => {
    if (center) return
    if (!navigator.geolocation) {
      setCenter(DEFAULT_CENTER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setCenter(DEFAULT_CENTER),
      { timeout: 5000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!center) {
    return (
      <div
        className="rounded-xl bg-slate-100 flex items-center justify-center"
        style={{ height }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ height }}>
      <MapContainer center={center} zoom={12} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {!readOnly && onChange && <ClickHandler onPick={onChange} />}
        {value && <Marker position={[value.lat, value.lon]} icon={pinIcon} />}
      </MapContainer>
    </div>
  )
}
