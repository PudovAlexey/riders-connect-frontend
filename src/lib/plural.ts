// Russian pluralization: picks the correct word form for a count.
// "1 точка", "3 точки", "10 точек".
export function plural(n: number, one: string, few: string, many: string): string {
  const m100 = n % 100
  const m10 = n % 10
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

/** Count prefixed to the correct Russian word form, e.g. pluralLabel(3,'точка','точки','точек') -> "3 точки". */
export const pluralLabel = (n: number, one: string, few: string, many: string) =>
  `${n} ${plural(n, one, few, many)}`
