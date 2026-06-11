// Default maintenance catalog. `defaultKm` is a sensible starting interval from
// a typical manual — the user edits it per bike. `kind` is a stable,
// language-independent key stored on the server; `label` is display-only.
// Items added as "Custom" use kind 'custom' with a free-text title (no entry here).

export interface ServiceCatalogEntry {
  kind: string
  label: string
  defaultKm: number
}

export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  { kind: 'oil', label: 'Engine oil', defaultKm: 6000 },
  { kind: 'chain_lube', label: 'Chain lube', defaultKm: 700 },
  { kind: 'chain_tension', label: 'Chain tension', defaultKm: 1000 },
  { kind: 'brake_pads', label: 'Brake pads', defaultKm: 15000 },
  { kind: 'oil_filter', label: 'Oil filter', defaultKm: 12000 },
  { kind: 'air_filter', label: 'Air filter', defaultKm: 12000 },
  { kind: 'spark_plugs', label: 'Spark plugs', defaultKm: 16000 },
  { kind: 'brake_fluid', label: 'Brake fluid', defaultKm: 24000 },
  { kind: 'coolant', label: 'Coolant', defaultKm: 24000 },
  { kind: 'chain_kit', label: 'Chain & sprockets', defaultKm: 25000 },
  { kind: 'tire_front', label: 'Front tire', defaultKm: 12000 },
  { kind: 'tire_rear', label: 'Rear tire', defaultKm: 8000 },
  { kind: 'valve_check', label: 'Valve clearance', defaultKm: 24000 },
]

const CATALOG_BY_KIND = new Map(SERVICE_CATALOG.map((e) => [e.kind, e]))

/** Display label for a service item: its own title, else the catalog label, else the raw kind. */
export function serviceLabel(item: { kind: string; title?: string }): string {
  if (item.title && item.title.trim()) return item.title
  return CATALOG_BY_KIND.get(item.kind)?.label ?? item.kind
}
