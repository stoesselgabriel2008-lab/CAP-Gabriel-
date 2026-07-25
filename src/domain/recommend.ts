// Moteur de recommandation local, déterministe et transparent.
// Chaque règle produit une recommandation avec un "pourquoi" en une phrase.

import type { AppState } from './types'
import { daysBetween, localHour, todayISO } from '../lib/dates'
import { dueQueue } from './srs'
import type { ReviewRating } from './types'

export type RecAction =
  | { kind: 'sos' }
  | { kind: 'checkin' }
  | { kind: 'focus'; minutes: number; unitId?: string; label?: string }
  | { kind: 'review-due' }
  | { kind: 'inbox' }
  | { kind: 'evening' }
  | { kind: 'error-journal' }
  | { kind: 'plan-tomorrow' }
  | { kind: 'open-timer' }
  | { kind: 'weekly-review' }

export interface Recommendation {
  id: string
  title: string
  subtitle: string
  why: string
  cta: string
  action: RecAction
}

export function todayCheckIn(state: AppState, today: string) {
  return state.checkIns.filter(c => c.date === today).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
}

export function computeDueQueue(state: AppState, today: string) {
  const examByUnit = new Map<string, string | null>()
  for (const u of state.studyUnits) {
    const subj = state.subjects.find(s => s.id === u.subjectId)
    examByUnit.set(u.id, subj?.examDate ?? null)
  }
  const lastRating = new Map<string, ReviewRating>()
  const sorted = [...state.reviewLogs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const log of sorted) lastRating.set(log.unitId, log.rating)
  return dueQueue(state.reviewPlans, today, examByUnit, lastRating)
}

export function recommend(state: AppState, now: Date = new Date()): Recommendation {
  const tz = state.profile.timezone
  const today = todayISO(tz, now)
  const hour = localHour(tz, now)
  const checkIn = todayCheckIn(state, today)
  const due = computeDueQueue(state, today)
  const inboxCount = state.captures.filter(c => !c.processedAt).length
  const energy = checkIn?.energy ?? null

  // 1. Minuteur actif : toujours prioritaire.
  if (state.activeTimer) {
    return {
      id: 'timer',
      title: 'Session en cours',
      subtitle: state.activeTimer.label,
      why: 'Un minuteur est actif : le plus utile est de le terminer.',
      cta: 'Reprendre la session',
      action: { kind: 'open-timer' }
    }
  }

  // 2. Envie élevée signalée aujourd'hui → SOS.
  if (checkIn && checkIn.urge >= 8) {
    return {
      id: 'sos',
      title: 'Traverser la vague',
      subtitle: 'Envie élevée signalée au check-in',
      why: `Tu as noté une envie à ${checkIn.urge}/10 : le SOS aide à ne pas décider dans l'urgence.`,
      cta: 'Lancer le SOS',
      action: { kind: 'sos' }
    }
  }

  // 3. Soirée + routine du soir non faite → fermeture du soir.
  const eveningDone = state.sleepLogs.some(l => l.date === today && l.note.includes('[fermeture]'))
    || state.journalEntries.some(j => j.date === today && j.text.startsWith('[fermeture]'))
  if (hour >= 21 && !eveningDone) {
    return {
      id: 'evening',
      title: 'Fermeture du soir',
      subtitle: '3 à 5 minutes pour préparer demain',
      why: 'Il est tard : vider la tête et choisir la première action de demain facilite le coucher.',
      cta: 'Commencer',
      action: { kind: 'evening' }
    }
  }

  // 4. Aucune donnée récente → check-in court.
  if (!checkIn) {
    return {
      id: 'checkin',
      title: 'Check-in rapide',
      subtitle: '15 secondes pour adapter la journée',
      why: "Sans check-in aujourd'hui, Cap ne peut pas adapter ses propositions à ton énergie.",
      cta: 'Faire le check-in',
      action: { kind: 'checkin' }
    }
  }

  // 5. Examen proche + erreurs non retestées → journal d'erreurs.
  const examSoon = state.subjects.some(s => s.examDate && daysBetween(today, s.examDate) >= 0 && daysBetween(today, s.examDate) <= 10)
  const untested = state.errorLogs.filter(e => !e.retested).length
  if (examSoon && untested > 0) {
    return {
      id: 'errors',
      title: 'Corriger tes erreurs',
      subtitle: `${untested} erreur${untested > 1 ? 's' : ''} à retester`,
      why: 'Un examen approche : retester ses erreurs corrigées rapporte plus que relire.',
      cta: 'Ouvrir le journal',
      action: { kind: 'error-journal' }
    }
  }

  // 6. Révisions dues → session adaptée à l'énergie.
  if (due.length > 0) {
    const first = due[0]
    if (energy === 'basse') {
      return {
        id: 'review-low',
        title: 'Rappel court',
        subtitle: `${due.length} révision${due.length > 1 ? 's' : ''} due${due.length > 1 ? 's' : ''}`,
        why: 'Énergie basse : une session courte de rappel plutôt qu\'un nouveau chapitre.',
        cta: 'Commencer 25 min',
        action: { kind: 'focus', minutes: 25, unitId: first.plan.unitId }
      }
    }
    return {
      id: 'review',
      title: 'Réviser maintenant',
      subtitle: `${due.length} révision${due.length > 1 ? 's' : ''} due${due.length > 1 ? 's' : ''} · ${first.why}`,
      why: energy === 'haute'
        ? 'Énergie haute et révisions dues : le bon moment pour une vraie session.'
        : 'Des révisions sont dues : les faire aujourd\'hui garde les intervalles efficaces.',
      cta: energy === 'haute' ? 'Commencer 50 min' : 'Commencer 25 min',
      action: { kind: 'focus', minutes: energy === 'haute' ? 50 : 25, unitId: first.plan.unitId }
    }
  }

  // 7. Inbox chargée → clarifier.
  if (inboxCount >= 3) {
    return {
      id: 'inbox',
      title: "Clarifier l'Inbox",
      subtitle: `${inboxCount} éléments à trier`,
      why: 'Aucune révision due et une Inbox chargée : trier 3 éléments libère la tête.',
      cta: 'Trier 3 éléments',
      action: { kind: 'inbox' }
    }
  }

  // 8. Top 3 avec tâches restantes → focus.
  const top3 = state.tasks.filter(t => !t.done && !t.deletedAt && t.top3Date === today)
  if (top3.length > 0) {
    const t = top3.sort((a, b) => (a.top3Rank ?? 9) - (b.top3Rank ?? 9))[0]
    const min = energy === 'basse' ? 25 : 50
    return {
      id: 'top3',
      title: t.title,
      subtitle: 'Priorité du jour',
      why: 'C\'est ta première priorité du Top 3 : la commencer maintenant évite de la porter toute la journée.',
      cta: `Commencer ${min} min`,
      action: { kind: 'focus', minutes: min, label: t.title }
    }
  }

  // 9. Soir → préparer demain.
  if (hour >= 18) {
    return {
      id: 'plan-tomorrow',
      title: 'Préparer demain',
      subtitle: 'Choisir le Top 3 de demain',
      why: 'Rien d\'urgent maintenant : décider ce soir rend le démarrage de demain plus facile.',
      cta: 'Planifier',
      action: { kind: 'plan-tomorrow' }
    }
  }

  // 10. Défaut : avancer ou se reposer honnêtement.
  return {
    id: 'free',
    title: 'Rien n\'est dû',
    subtitle: 'Tu peux avancer un chapitre ou t\'arrêter là',
    why: 'Aucune révision due, pas de tâche prioritaire : avancer est un bonus, pas une dette.',
    cta: 'Lancer une session libre',
    action: { kind: 'focus', minutes: 25 }
  }
}

/** Ajustement du Top 3 si sommeil ressenti mauvais : suggérer de réduire. */
export function shouldReduceAmbition(state: AppState, today: string): boolean {
  const c = todayCheckIn(state, today)
  return !!c && c.sleepFelt === 'mauvais'
}
