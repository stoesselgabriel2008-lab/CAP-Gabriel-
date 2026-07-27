// Coach IA : appels directs à l'API Claude depuis le navigateur.
// La clé API reste sur l'appareil (localStorage, exclue des exports).
// Aucun serveur intermédiaire — fidèle à la philosophie 100 % local de Cap,
// à ceci près : quand Gabriel envoie un message, la conversation et le
// résumé de ses données du jour partent chez Anthropic (affiché dans l'UI).

import Anthropic, {
  APIConnectionError, APIError, AuthenticationError, BadRequestError, RateLimitError
} from '@anthropic-ai/sdk'
import type { AppState } from '../domain/types'
import { todayISO, addDays, daysBetween, formatCivilLong } from '../lib/dates'
import { computeDueQueue } from '../domain/recommend'

const KEY_STORAGE = 'cap-ai-key'
const MODEL_STORAGE = 'cap-ai-model'
const CHAT_STORAGE = 'cap-ai-chat'

export const AI_MODELS = [
  { id: 'claude-opus-5', label: 'Opus 5', desc: 'Le plus intelligent — conseillé' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5', desc: 'Excellent et moins cher' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', desc: 'Rapide et économique' }
]

export function getApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}
export function setApiKey(k: string): void {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k)
    else localStorage.removeItem(KEY_STORAGE)
  } catch { /* stockage indisponible */ }
}
export function getModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE) ?? 'claude-opus-5' } catch { return 'claude-opus-5' }
}
export function setModel(m: string): void {
  try { localStorage.setItem(MODEL_STORAGE, m) } catch { /* stockage indisponible */ }
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
}

export function loadChat(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(m => m && typeof m.text === 'string')
    return []
  } catch { return [] }
}
export function saveChat(msgs: ChatMsg[]): void {
  try { localStorage.setItem(CHAT_STORAGE, JSON.stringify(msgs.slice(-40))) } catch { /* plein */ }
}
export function clearChat(): void {
  try { localStorage.removeItem(CHAT_STORAGE) } catch { /* rien */ }
}

/** Résumé compact des données du jour, injecté dans le prompt système. */
export function buildSnapshot(state: AppState): string {
  const today = todayISO(state.profile.timezone)
  const lines: string[] = []

  const tasks = state.tasks.filter(t => !t.deletedAt && !t.done)
  const todayTasks = tasks.filter(t => t.plannedDate === today)
  const overdue = tasks.filter(t => t.plannedDate && t.plannedDate < today)
  if (todayTasks.length) lines.push(`Tâches prévues aujourd'hui : ${todayTasks.map(t => t.title).slice(0, 6).join(' ; ')}`)
  if (overdue.length) lines.push(`Tâches en retard : ${overdue.length}`)

  const top3 = state.tasks.filter(t => !t.deletedAt && t.top3Date === today)
  if (top3.length) lines.push(`Top 3 du jour : ${top3.map(t => `${t.title}${t.done ? ' (faite)' : ''}`).join(' ; ')}`)

  const due = computeDueQueue(state, today)
  if (due.length) {
    const names = due.slice(0, 4).map(d => {
      const u = state.studyUnits.find(x => x.id === d.plan.unitId)
      return u?.name ?? '?'
    })
    lines.push(`Révisions dues : ${due.length} (${names.join(', ')})`)
  } else {
    lines.push('Révisions : rien de dû aujourd\'hui')
  }

  const exam = state.subjects
    .filter(s => s.examDate && daysBetween(today, s.examDate) >= 0)
    .sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0]
  if (exam) lines.push(`Prochain examen : ${exam.name} dans ${daysBetween(today, exam.examDate!)} jours`)

  const focusMin = state.focusSessions
    .filter(s => s.endedAt && s.startedAt.slice(0, 10) === today)
    .reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
  const goal = state.settings.dailyFocusGoalMin
  lines.push(`Focus aujourd'hui : ${focusMin} min${goal ? ` / objectif ${goal} min` : ''}`)

  const weekAgo = addDays(today, -7)
  const weekMin = state.focusSessions
    .filter(s => s.endedAt && s.startedAt.slice(0, 10) >= weekAgo)
    .reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
  if (weekMin) lines.push(`Focus sur 7 jours : ${weekMin} min`)

  const streak = Math.max(0, daysBetween(state.commitment.startDate, today))
  lines.push(`Engagement personnel : ${streak} jours tenus (départ ${formatCivilLong(state.commitment.startDate)})`)

  for (const r of state.resistances) {
    const d = Math.max(0, daysBetween(r.startDate, today))
    lines.push(`Compteur « ${r.name} » : ${d} jours tenus (record ${Math.max(r.bestDays, d)})`)
  }

  const ci = state.checkIns.filter(c => c.date === today).sort((a, b) => b.at.localeCompare(a.at))[0]
  if (ci) lines.push(`Check-in du jour : énergie ${ci.energy}, stress ${ci.stress}, sommeil ressenti ${ci.sleepFelt}${ci.urge > 0 ? `, envie ${ci.urge}/10` : ''}`)

  const sleep = state.sleepLogs.filter(s => s.date === today || s.date === addDays(today, -1)).slice(-1)[0]
  if (sleep?.bedTime && sleep?.wakeTime) lines.push(`Dernière nuit : couché ${sleep.bedTime}, levé ${sleep.wakeTime}`)

  const habitsDue = state.routines.filter(r => !r.archived).length
  if (habitsDue) lines.push(`Habitudes suivies : ${habitsDue}`)

  return lines.join('\n')
}

export function buildSystemPrompt(state: AppState): string {
  const today = todayISO(state.profile.timezone)
  const age = Math.floor(daysBetween(state.profile.birthDate, today) / 365.25)
  return `Tu es le Coach IA de « Cap », l'application personnelle de ${state.profile.firstName}, ${age} ans, qui prépare le PASS (première année de médecine) à l'Université Paris Cité.

Ton rôle : coach d'étude et de discipline — révisions (méthode des J, rappel actif, espacement), organisation, sommeil, concentration, et soutien dans son engagement personnel de sobriété numérique (résister à la pornographie).

Règles :
- Réponds en français et tutoie-le.
- Sois concret et bref : quelques phrases pour une question simple, des étapes numérotées seulement quand c'est utile. Pas de pavés.
- Appuie-toi sur ses données ci-dessous quand c'est pertinent — cite les vrais chiffres, ne les invente jamais.
- Scientifiquement honnête : rappel actif, espacement et sommeil sont solides ; pas de neuro-mythes (pas de « dopamine detox », pas de promesses sur la testostérone).
- Encourage sans flatter. S'il craque ou décroche, zéro culpabilisation : on analyse le déclencheur et on repart.
- Tu n'es ni médecin ni psychologue. Si tu perçois une détresse sérieuse, conseille-lui d'en parler à un adulte de confiance ou à un professionnel (en France : 3114, gratuit, 24h/24).

Données du jour (${formatCivilLong(today)}) :
${buildSnapshot(state)}`
}

export interface AskResult {
  text: string
  refused: boolean
}

/**
 * Envoie la conversation à Claude en streaming.
 * `onDelta` reçoit le texte cumulé au fil de la génération.
 */
export async function askCoach(
  state: AppState,
  history: ChatMsg[],
  onDelta: (text: string) => void
): Promise<AskResult> {
  const client = new Anthropic({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true // la clé appartient à l'utilisateur et reste sur son appareil
  })

  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 1500,
    system: buildSystemPrompt(state),
    messages: history.map(m => ({ role: m.role, content: m.text }))
  })

  let acc = ''
  stream.on('text', delta => {
    acc += delta
    onDelta(acc)
  })

  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    return { text: acc, refused: true }
  }
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  return { text: text || acc, refused: false }
}

/** Message d'erreur en français selon le type d'échec. */
export function errorMessage(e: unknown): string {
  if (e instanceof AuthenticationError) {
    return 'Clé API invalide ou révoquée. Vérifie-la dans les réglages du Coach IA.'
  }
  if (e instanceof RateLimitError) {
    return 'Trop de demandes d\'un coup — attends une minute puis réessaie.'
  }
  if (e instanceof BadRequestError) {
    const msg = String(e.message ?? '')
    if (msg.includes('credit')) return 'Crédits épuisés sur ton compte Anthropic — recharge sur console.anthropic.com.'
    return 'Requête refusée par l\'API. Réessaie, ou démarre une nouvelle conversation.'
  }
  if (e instanceof APIConnectionError) {
    return 'Pas de connexion. Le Coach IA a besoin d\'internet — tout le reste de Cap marche hors ligne.'
  }
  if (e instanceof APIError) {
    return 'L\'API Claude est momentanément indisponible. Réessaie dans un instant.'
  }
  return 'Erreur inattendue. Réessaie.'
}
