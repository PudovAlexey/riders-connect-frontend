import L from 'leaflet'

export interface CategoryMeta {
  key: string
  label: string
  color: string
  /** Inner SVG markup (line glyph on a 0 0 24 24 viewBox, drawn with currentColor). */
  svg: string
}

// 20 point categories. `svg` holds only the inner glyph markup so it can be drawn
// both white (on a colored map pin) and in currentColor (in filter chips).
export const POINT_CATEGORIES: CategoryMeta[] = [
  { key: 'towing', label: 'Towing', color: '#ef4444',
    svg: '<path d="M3 17V9h8v8"/><path d="M11 11h4l4 3v3"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>' },
  { key: 'tire_service', label: 'Tire service', color: '#334155',
    svg: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4.5v2.5M12 17v2.5M4.5 12h2.5M17 12h2.5"/>' },
  { key: 'service', label: 'Service', color: '#3b82f6',
    svg: '<path d="M15.5 8.5a3 3 0 0 1-3.9 3.9l-5.1 5.1L8 19.5l5.1-5.1a3 3 0 0 0 3.9-3.9l-2 2-1.5-1.5z"/>' },
  { key: 'dealer', label: 'Dealer', color: '#8b5cf6',
    svg: '<path d="M3.5 11.5l8-8 9 9-8 8z"/><circle cx="8" cy="8" r="1.5"/>' },
  { key: 'gear', label: 'Gear', color: '#f59e0b',
    svg: '<path d="M4 14a8 8 0 0 1 16 0v2H4z"/><path d="M4 16h16"/><path d="M9 16v3h6v-3"/>' },
  { key: 'wash', label: 'Wash', color: '#06b6d4',
    svg: '<path d="M12 4s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0C6.5 10 12 4 12 4z"/>' },
  { key: 'bar', label: 'Biker bar', color: '#a16207',
    svg: '<path d="M6 8h9v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M15 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 4.5v2M11 4.5v2"/>' },
  { key: 'scenic', label: 'Scenic spot', color: '#10b981',
    svg: '<path d="M3 18l5-8 3.5 5 3-5L20 18z"/><circle cx="17" cy="7" r="1.6"/>' },
  { key: 'racetrack', label: 'Racetrack', color: '#111827',
    svg: '<path d="M6 3v18"/><path d="M6 4h12l-2.5 3.5L18 11H6"/>' },
  { key: 'gymkhana', label: 'Gymkhana', color: '#f97316',
    svg: '<path d="M8 18.5h8"/><path d="M12 6l3 12H9z"/><path d="M10.3 11h3.4"/>' },
  { key: 'gas_station', label: 'Gas station', color: '#16a34a',
    svg: '<path d="M5 20V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15"/><path d="M3.5 20h11"/><path d="M6 9h6"/><path d="M13 8l3 3v5a1.8 1.8 0 0 0 1.8-1.8V9.5L16 7"/>' },
  { key: 'parking', label: 'Parking', color: '#2563eb',
    svg: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9.5 16V8h3a2.4 2.4 0 0 1 0 4.8h-3"/>' },
  { key: 'camping', label: 'Camping', color: '#65a30d',
    svg: '<path d="M3 19l9-13 9 13"/><path d="M9 19l3-4.5 3 4.5"/>' },
  { key: 'cafe', label: 'Cafe', color: '#92400e',
    svg: '<path d="M5 9h11v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M7 4.5v2M11 4.5v2"/>' },
  { key: 'riding_school', label: 'Riding school', color: '#7c3aed',
    svg: '<path d="M12 4 2.5 9 12 14l9.5-5z"/><path d="M6 11v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-4"/>' },
  { key: 'rental', label: 'Rental', color: '#0891b2',
    svg: '<circle cx="8" cy="12" r="3.2"/><path d="M11.2 12H20M17 12v3M20 12v2.2"/>' },
  { key: 'parts', label: 'Parts', color: '#475569',
    svg: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12h2.5M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18"/>' },
  { key: 'tuning', label: 'Tuning', color: '#db2777',
    svg: '<path d="M13.5 8a3 3 0 0 0-4 4l-4.5 4.5L7 18.5l4.5-4.5a3 3 0 0 0 4-4l-1.8 1.8-1.5-1.5z"/><path d="M18 3.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z"/>' },
  { key: 'police', label: 'Police / cameras', color: '#1d4ed8',
    svg: '<rect x="3" y="8" width="13" height="9" rx="1.5"/><path d="M16 11l5-2.5v7L16 13z"/><circle cx="8.5" cy="12.5" r="2"/>' },
  { key: 'hazard', label: 'Hazard', color: '#d97706',
    svg: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.5v.2"/>' },
]

const byKey = new Map(POINT_CATEGORIES.map((c) => [c.key, c]))

const FALLBACK: CategoryMeta = {
  key: 'unknown',
  label: 'Point',
  color: '#64748b',
  svg: '<circle cx="12" cy="12" r="7"/>',
}

export function categoryMeta(key: string): CategoryMeta {
  return byKey.get(key) ?? FALLBACK
}

/** Renders the category glyph as a standalone <svg> string (for chips / detail). */
export function categorySvg(key: string, size = 20): string {
  const m = categoryMeta(key)
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${m.svg}</svg>`
}

const iconCache = new Map<string, L.DivIcon>()

/** Teardrop map pin in the category color with a white glyph; cached per category. */
export function createCategoryIcon(key: string): L.DivIcon {
  const cached = iconCache.get(key)
  if (cached) return cached
  const m = categoryMeta(key)
  const html = `
    <div style="position:relative;width:32px;height:42px">
      <div style="position:absolute;left:0;top:0;width:32px;height:32px;background:${m.color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px rgba(0,0,0,0.35)"></div>
      <div style="position:absolute;left:6px;top:6px;width:20px;height:20px;color:white">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${m.svg}</svg>
      </div>
    </div>`
  const icon = L.divIcon({ className: '', html, iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -38] })
  iconCache.set(key, icon)
  return icon
}
