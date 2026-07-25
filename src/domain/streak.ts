// Série d'engagement : jours entiers écoulés depuis la date de départ,
// calculés sur les dates civiles Europe/Paris (pas de dérive de minuit).

import { addDays, daysBetween } from '../lib/dates'
import type { CommitmentState, LapseEvent } from './types'

/** Jours de série actuelle (0 le jour du départ). */
export function currentStreak(c: CommitmentState, today: string): number {
  return Math.max(0, daysBetween(c.startDate, today))
}

/** Meilleur record, en tenant compte de la série en cours. */
export function bestStreak(c: CommitmentState, today: string): number {
  return Math.max(c.bestStreak, currentStreak(c, today))
}

/** Sur les 30 derniers jours : nombre de jours "alignés" (sans écart). */
export function alignedDaysLast30(lapses: LapseEvent[], today: string): number {
  const lapseDates = new Set(lapses.map(l => l.date))
  let aligned = 0
  for (let i = 0; i < 30; i++) {
    if (!lapseDates.has(addDays(today, -i))) aligned++
  }
  return aligned
}

/** Après déclaration d'un écart : nouvelle base de série et record mis à jour. */
export function afterLapse(c: CommitmentState, today: string): CommitmentState {
  const streak = currentStreak(c, today)
  return {
    ...c,
    bestStreak: Math.max(c.bestStreak, streak),
    startDate: today
  }
}
