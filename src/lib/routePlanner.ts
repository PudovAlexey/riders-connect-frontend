// Shared types + helpers for the map route planner (used by RoutePlanner.tsx
// and MapPage.tsx). Kept out of the component file so it can export non-
// component values without tripping react-refresh.

export type PlaceGroup = 'poi' | 'rider' | 'event'

export type Endpoint =
  | { kind: 'me' }
  | { kind: 'pin'; pos: [number, number] }
  | { kind: 'place'; name: string; pos: [number, number]; group: PlaceGroup }

export type EndpointTarget = 'from' | 'to'

export interface PlaceItem {
  id: string
  name: string
  sub: string
  pos: [number, number]
  group: PlaceGroup
}

export function endpointLabel(e: Endpoint | null): string {
  if (!e) return 'Не выбрано'
  if (e.kind === 'me') return 'Моё местоположение'
  if (e.kind === 'pin') return 'Точка на карте'
  return e.name
}
