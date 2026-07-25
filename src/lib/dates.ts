// Utilitaires de dates. Instants en ISO (UTC), dates civiles en "YYYY-MM-DD"
// calculées dans le fuseau Europe/Paris. Les différences de jours se font en
// UTC-midnight sur les dates civiles pour éviter les pièges de DST.

export const TIMEZONE = 'Europe/Paris'

const civilFmtCache = new Map<string, Intl.DateTimeFormat>()

function civilFormatter(tz: string): Intl.DateTimeFormat {
  let f = civilFmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    })
    civilFmtCache.set(tz, f)
  }
  return f
}

/** Date civile "YYYY-MM-DD" d'un instant, dans le fuseau donné. */
export function civilDateOf(instant: Date, tz: string = TIMEZONE): string {
  return civilFormatter(tz).format(instant)
}

export function todayISO(tz: string = TIMEZONE, now: Date = new Date()): string {
  return civilDateOf(now, tz)
}

export function isValidCivil(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function civilToUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** b - a en jours entiers (dates civiles). */
export function daysBetween(a: string, b: string): number {
  return Math.round((civilToUTC(b) - civilToUTC(a)) / 86400000)
}

export function addDays(s: string, n: number): string {
  const t = civilToUTC(s) + n * 86400000
  const d = new Date(t)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Âge en années révolues à la date civile donnée. */
export function ageAt(birthISO: string, onISO: string): number {
  const [by, bm, bd] = birthISO.split('-').map(Number)
  const [y, m, d] = onISO.split('-').map(Number)
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age--
  return Math.max(0, age)
}

/** Heure locale (0-23) dans le fuseau donné. */
export function localHour(tz: string = TIMEZONE, now: Date = new Date()): number {
  const f = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: 'numeric', hour12: false })
  return parseInt(f.format(now), 10)
}

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) pour une date civile. */
export function isoWeekday(s: string): number {
  const d = new Date(civilToUTC(s)).getUTCDay()
  return d === 0 ? 7 : d
}

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** "mardi 29 juillet" */
export function formatCivilLong(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  return `${DAY_NAMES[isoWeekday(s) - 1]} ${d} ${MONTH_NAMES[m - 1]}`
}

/** "29/07/2026" */
export function formatCivilShort(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

/** Libellé relatif : Aujourd'hui, Demain, Hier, ou date courte. */
export function relativeLabel(s: string, today: string): string {
  const diff = daysBetween(today, s)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 1 && diff < 7) return formatCivilLong(s).split(' ')[0]
  return formatCivilShort(s)
}

/** "25:00" ou "1:05:00" à partir de millisecondes. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function nowISO(): string {
  return new Date().toISOString()
}
