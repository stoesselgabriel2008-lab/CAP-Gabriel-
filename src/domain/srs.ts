// Méthode des J : plan de révision espacée lié à un chapitre.
// Séquence par défaut J0, J1, J3, J7, J14, J30, puis ~J60 plafonné.
// Adaptation après chaque révision : facile allonge prudemment, moyen conserve,
// difficile rapproche, oublié revoit dès demain.

import { addDays, daysBetween } from '../lib/dates'
import type { ReviewPlan, ReviewRating } from './types'
import { newId } from '../lib/id'
import { nowISO } from '../lib/dates'

export const J_SEQUENCE = [0, 1, 3, 7, 14, 30]
export const MAX_INTERVAL = 60

export function createPlan(unitId: string, learnedOn: string): ReviewPlan {
  return {
    id: newId('plan'),
    unitId,
    learnedOn,
    stage: 0,
    intervalDays: 1, // prochain intervalle : J0 -> J1
    nextDue: learnedOn, // J0 : à revoir le jour même
    active: true,
    createdAt: nowISO()
  }
}

/** Intervalle "standard" pour passer du stage s au stage s+1. */
function baseInterval(stage: number): number {
  if (stage + 1 < J_SEQUENCE.length) return J_SEQUENCE[stage + 1] - J_SEQUENCE[stage]
  return MAX_INTERVAL
}

export interface ReviewOutcome {
  stage: number
  intervalDays: number
  nextDue: string
}

/** Applique une note de révision et calcule la prochaine échéance. */
export function applyReview(plan: ReviewPlan, rating: ReviewRating, today: string): ReviewOutcome {
  const base = baseInterval(plan.stage)
  let stage = plan.stage
  let interval: number

  switch (rating) {
    case 'facile':
      stage = plan.stage + 1
      interval = Math.min(MAX_INTERVAL, Math.max(1, Math.round(base * 1.25)))
      break
    case 'moyen':
      stage = plan.stage + 1
      interval = Math.max(1, base)
      break
    case 'difficile':
      stage = plan.stage // on ne progresse pas
      interval = Math.max(1, Math.round(base * 0.5))
      break
    case 'oublie':
      stage = Math.max(0, plan.stage - 1)
      interval = 1
      break
  }
  return { stage, intervalDays: interval, nextDue: addDays(today, interval) }
}

export interface DueItem {
  plan: ReviewPlan
  overdueDays: number
  examInDays: number | null
  score: number
  why: string
}

/**
 * File "À revoir" : priorité par retard, proximité d'examen et dernière
 * performance. Le score est une somme pondérée simple et explicable.
 */
export function dueQueue(
  plans: ReviewPlan[],
  today: string,
  examDates: Map<string, string | null>, // unitId -> examDate
  lastRating: Map<string, ReviewRating>
): DueItem[] {
  const items: DueItem[] = []
  for (const plan of plans) {
    if (!plan.active) continue
    const overdue = daysBetween(plan.nextDue, today)
    if (overdue < 0) continue
    const exam = examDates.get(plan.unitId) ?? null
    const examIn = exam ? daysBetween(today, exam) : null
    const rating = lastRating.get(plan.unitId)

    let score = Math.min(overdue, 10) * 2
    const whyParts: string[] = []
    whyParts.push(overdue === 0 ? "dû aujourd'hui" : `dû depuis ${overdue} j`)
    if (examIn !== null && examIn >= 0 && examIn <= 21) {
      score += (21 - examIn)
      whyParts.push(`examen dans ${examIn} j`)
    }
    if (rating === 'difficile' || rating === 'oublie') {
      score += 8
      whyParts.push('rappel précédent difficile')
    }
    items.push({ plan, overdueDays: overdue, examInDays: examIn, score, why: whyParts.join(' · ') })
  }
  items.sort((a, b) => b.score - a.score)
  return items
}
