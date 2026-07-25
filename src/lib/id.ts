let counter = 0

/** ID stable, unique, lisible. */
export function newId(prefix = 'x'): string {
  counter = (counter + 1) % 10000
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}_${counter}`
}
