import L from 'leaflet'

export interface CategoryMeta {
  key: string
  label: string
  color: string
  /** Inner SVG markup (glyph on a 0 0 24 24 viewBox, drawn with currentColor). */
  svg: string
}

// 20 point categories. `svg` holds only the inner glyph markup so it can be drawn
// both white (on a colored map pin) and in currentColor (in filter chips).
// Glyphs are sourced verbatim from Lucide (ISC) / Tabler, except the tire and
// checkered-flag glyphs which are hand-drawn in the same line style.
export const POINT_CATEGORIES: CategoryMeta[] = [
  { key: 'towing', label: 'Эвакуатор', color: '#ef4444',
    svg: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>' },
  { key: 'tire_service', label: 'Шиномонтаж', color: '#334155',
    svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64 7.76 7.76M16.24 16.24l2.12 2.12M18.36 5.64 16.24 7.76M7.76 16.24 5.64 18.36"/>' },
  { key: 'service', label: 'Сервис', color: '#3b82f6',
    svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>' },
  { key: 'dealer', label: 'Дилер', color: '#8b5cf6',
    svg: '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>' },
  { key: 'gear', label: 'Экипировка', color: '#f59e0b',
    svg: '<path d="M12 4a9 9 0 0 1 5.656 16h-11.312a9 9 0 0 1 5.656 -16"/><path d="M20 9h-8.8a1 1 0 0 0 -.968 1.246c.507 2 1.596 3.418 3.268 4.254c2 1 4.333 1.5 7 1.5"/>' },
  { key: 'wash', label: 'Мойка', color: '#06b6d4',
    svg: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>' },
  { key: 'bar', label: 'Байк-бар', color: '#a16207',
    svg: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>' },
  { key: 'scenic', label: 'Смотровая', color: '#10b981',
    svg: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"/>' },
  { key: 'racetrack', label: 'Трек', color: '#111827',
    svg: '<path d="M5 21V4"/><rect x="6" y="3.5" width="9" height="9" rx="0.5"/><path d="M10.5 3.5v9M6 8h9"/><rect x="6" y="3.5" width="4.5" height="4.5" fill="currentColor" stroke="none"/><rect x="10.5" y="8" width="4.5" height="4.5" fill="currentColor" stroke="none"/>' },
  { key: 'gymkhana', label: 'Джимхана', color: '#f97316',
    svg: '<path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/><path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/><path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/><path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/>' },
  { key: 'gas_station', label: 'Заправка', color: '#16a34a',
    svg: '<path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"/><path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"/><path d="M2 21h13"/><path d="M3 9h11"/>' },
  { key: 'parking', label: 'Парковка', color: '#2563eb',
    svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>' },
  { key: 'camping', label: 'Кемпинг', color: '#65a30d',
    svg: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>' },
  { key: 'cafe', label: 'Кафе', color: '#92400e',
    svg: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>' },
  { key: 'riding_school', label: 'Мотошкола', color: '#7c3aed',
    svg: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>' },
  { key: 'rental', label: 'Прокат', color: '#0891b2',
    svg: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>' },
  { key: 'parts', label: 'Запчасти', color: '#475569',
    svg: '<path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>' },
  { key: 'tuning', label: 'Тюнинг', color: '#db2777',
    svg: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>' },
  { key: 'police', label: 'Полиция / камеры', color: '#1d4ed8',
    svg: '<path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/><path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/><path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/><path d="M2 21v-4"/><path d="M7 9h.01"/>' },
  { key: 'hazard', label: 'Опасность', color: '#d97706',
    svg: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>' },
]

const byKey = new Map(POINT_CATEGORIES.map((c) => [c.key, c]))

const FALLBACK: CategoryMeta = {
  key: 'unknown',
  label: 'Точка',
  color: '#64748b',
  svg: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
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
    <div style="position:relative;width:34px;height:44px">
      <div style="position:absolute;left:1px;top:1px;width:32px;height:32px;background:${m.color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.4)"></div>
      <div style="position:absolute;left:7px;top:6px;width:20px;height:20px;color:white">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${m.svg}</svg>
      </div>
    </div>`
  const icon = L.divIcon({ className: '', html, iconSize: [34, 44], iconAnchor: [17, 43], popupAnchor: [0, -40] })
  iconCache.set(key, icon)
  return icon
}
