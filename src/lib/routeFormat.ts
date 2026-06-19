import { pluralLabel } from './plural'

// Russian pluralization for the waypoint count: "1 точка", "3 точки", "10 точек".
export function pointsLabel(n: number): string {
  return pluralLabel(n, 'точка', 'точки', 'точек')
}
