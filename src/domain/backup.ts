// Export / import de sauvegarde. Validation défensive : aucun import ne
// modifie les données sans validation et aperçu préalables.

import type { AppState } from './types'
import { defaultState, SCHEMA_VERSION, APP_VERSION } from './types'
import { isValidCivil, nowISO } from '../lib/dates'

export interface BackupFile {
  format: 'cap-gabriel-backup'
  schemaVersion: number
  exportedAt: string
  appVersion: string
  timezone: string
  data: AppState
}

export function exportBackup(state: AppState): BackupFile {
  return {
    format: 'cap-gabriel-backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    appVersion: APP_VERSION,
    timezone: state.profile.timezone,
    data: state
  }
}

export interface ImportPreview {
  valid: boolean
  error: string | null
  counts: Record<string, number>
  exportedAt: string | null
  schemaVersion: number | null
  state: AppState | null
}

const ARRAY_KEYS: (keyof AppState)[] = [
  'captures', 'tasks', 'projects', 'goals', 'routines', 'routineLogs',
  'subjects', 'studyUnits', 'reviewPlans', 'reviewLogs', 'focusSessions',
  'errorLogs', 'checkIns', 'urgeEvents', 'lapseEvents', 'ifThenPlans',
  'sleepLogs', 'bodyLogs', 'journalEntries', 'socialExercises', 'ankiLogs',
  'weeklyReviews'
]

/** Valide un fichier importé et produit un aperçu. Ne modifie rien. */
export function validateImport(raw: unknown): ImportPreview {
  const fail = (error: string): ImportPreview =>
    ({ valid: false, error, counts: {}, exportedAt: null, schemaVersion: null, state: null })

  if (!raw || typeof raw !== 'object') return fail('Ce fichier ne contient pas de données lisibles.')
  const obj = raw as Record<string, unknown>
  if (obj.format !== 'cap-gabriel-backup') {
    return fail('Ce fichier ne correspond pas à une sauvegarde Cap reconnue.')
  }
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 1) {
    return fail('Version de schéma inconnue.')
  }
  if (obj.schemaVersion > SCHEMA_VERSION) {
    return fail('Cette sauvegarde vient d\'une version plus récente de Cap. Mets à jour l\'app d\'abord.')
  }
  const data = obj.data
  if (!data || typeof data !== 'object') return fail('La sauvegarde ne contient pas de données.')

  const sanitized = sanitizeState(data as Partial<AppState>)
  const counts: Record<string, number> = {}
  for (const k of ARRAY_KEYS) counts[k] = (sanitized[k] as unknown[]).length

  return {
    valid: true,
    error: null,
    counts,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null,
    schemaVersion: obj.schemaVersion,
    state: sanitized
  }
}

/** Reconstruit un AppState sain à partir de données partielles ou douteuses. */
export function sanitizeState(partial: Partial<AppState>): AppState {
  const base = defaultState()
  const out: AppState = { ...base }

  if (partial.profile && typeof partial.profile === 'object') {
    const p = partial.profile
    out.profile = {
      firstName: typeof p.firstName === 'string' && p.firstName.trim() ? p.firstName.trim().slice(0, 60) : base.profile.firstName,
      birthDate: typeof p.birthDate === 'string' && isValidCivil(p.birthDate) ? p.birthDate : base.profile.birthDate,
      timezone: typeof p.timezone === 'string' && p.timezone ? p.timezone : base.profile.timezone,
      priority: (['pass', 'sommeil', 'controle', 'forme', 'social'] as const).includes(p.priority as any) ? p.priority : base.profile.priority,
      wakeTarget: typeof p.wakeTarget === 'string' && /^\d{2}:\d{2}$/.test(p.wakeTarget) ? p.wakeTarget : base.profile.wakeTarget
    }
  }
  if (partial.settings && typeof partial.settings === 'object') {
    out.settings = { ...base.settings, ...pickBooleans(partial.settings, ['onboardingDone', 'reducedTransparency', 'hideSensitivePreviews']) }
    if (typeof partial.settings.lastBackupAt === 'string') out.settings.lastBackupAt = partial.settings.lastBackupAt
    if (Array.isArray(partial.settings.hintsDismissed)) out.settings.hintsDismissed = partial.settings.hintsDismissed.filter(x => typeof x === 'string')
    if (typeof partial.settings.lastSeenVersion === 'string') out.settings.lastSeenVersion = partial.settings.lastSeenVersion
    if ((['sobre', 'clair', 'glass'] as const).includes(partial.settings.appearance as any)) out.settings.appearance = partial.settings.appearance as 'sobre' | 'clair' | 'glass'
  }
  if (partial.commitment && typeof partial.commitment === 'object') {
    const c = partial.commitment
    out.commitment = {
      startDate: typeof c.startDate === 'string' && isValidCivil(c.startDate) ? c.startDate : base.commitment.startDate,
      originalStart: typeof c.originalStart === 'string' && isValidCivil(c.originalStart) ? c.originalStart : base.commitment.originalStart,
      bestStreak: typeof c.bestStreak === 'number' && c.bestStreak >= 0 ? Math.floor(c.bestStreak) : 0
    }
  }
  for (const k of ARRAY_KEYS) {
    const v = partial[k]
    if (Array.isArray(v)) {
      // filtre : objets avec id string uniquement (défensif, pas destructif)
      ;(out as any)[k] = v.filter(item => item && typeof item === 'object' && typeof (item as any).id === 'string')
    }
  }
  out.activeTimer = null // un minuteur ne survit pas à un import
  out.schemaVersion = SCHEMA_VERSION
  return out
}

function pickBooleans<T extends object>(obj: T, keys: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const k of keys) {
    const v = (obj as any)[k]
    if (typeof v === 'boolean') out[k] = v
  }
  return out
}

/** Fusion : les éléments importés absents (par id) sont ajoutés, l'existant est conservé. */
export function mergeStates(current: AppState, incoming: AppState): AppState {
  const out: AppState = { ...current }
  for (const k of ARRAY_KEYS) {
    const cur = current[k] as Array<{ id: string }>
    const inc = incoming[k] as Array<{ id: string }>
    const ids = new Set(cur.map(x => x.id))
    ;(out as any)[k] = [...cur, ...inc.filter(x => !ids.has(x.id))]
  }
  // le record le plus élevé gagne ; la date de départ la plus récente est gardée
  out.commitment = {
    ...current.commitment,
    bestStreak: Math.max(current.commitment.bestStreak, incoming.commitment.bestStreak)
  }
  return out
}
