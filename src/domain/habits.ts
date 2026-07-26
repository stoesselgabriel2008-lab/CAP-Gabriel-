// Habitudes : planification, complétion, séries et données de graphiques.
// Une journée manquée n'efface pas le progrès : on montre aussi le taux.

import { addDays, isoWeekday } from '../lib/dates'
import type { Routine, RoutineLog } from './types'

/** L'habitude est-elle prévue ce jour-là ? (jamais avant sa création) */
export function isScheduled(r: Routine, date: string): boolean {
  if (r.archived) return false
  if (r.createdAt && date < r.createdAt.slice(0, 10)) return false
  switch (r.schedule) {
    case 'daily': return true
    case 'weekdays': return isoWeekday(date) <= 5
    case 'custom': return r.customDays.includes(isoWeekday(date))
  }
}

export function logFor(logs: RoutineLog[], routineId: string, date: string): RoutineLog | undefined {
  return logs.find(l => l.routineId === routineId && l.date === date)
}

export function isDone(logs: RoutineLog[], routineId: string, date: string): boolean {
  return logFor(logs, routineId, date)?.done === true
}

/**
 * Série actuelle : jours prévus consécutifs faits, en remontant depuis
 * aujourd'hui (si fait) ou hier. Les jours non prévus ne cassent pas la série.
 */
export function habitStreak(r: Routine, logs: RoutineLog[], today: string): number {
  let streak = 0
  let date = today
  // le jour même ne casse la série que s'il est prévu ET explicitement manqué
  if (isScheduled(r, date) && !isDone(logs, r.id, date)) {
    date = addDays(date, -1)
  }
  for (let i = 0; i < 366; i++) {
    if (isScheduled(r, date)) {
      if (isDone(logs, r.id, date)) streak++
      else break
    }
    date = addDays(date, -1)
  }
  return streak
}

export interface Completion {
  done: number
  scheduled: number
  rate: number // 0..1, 1 si rien de prévu
}

/** Taux de complétion sur les n derniers jours (aujourd'hui inclus). */
export function completionRate(r: Routine, logs: RoutineLog[], today: string, days = 30): Completion {
  let done = 0, scheduled = 0
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i)
    if (isScheduled(r, date)) {
      scheduled++
      if (isDone(logs, r.id, date)) done++
    }
  }
  return { done, scheduled, rate: scheduled === 0 ? 1 : done / scheduled }
}

export type DayState = 'done' | 'missed' | 'off' | 'future'

/** États des n derniers jours (du plus ancien au plus récent) pour la grille. */
export function dayStates(r: Routine, logs: RoutineLog[], today: string, days = 28): Array<{ date: string; state: DayState }> {
  const out: Array<{ date: string; state: DayState }> = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    if (!isScheduled(r, date)) out.push({ date, state: 'off' })
    else if (isDone(logs, r.id, date)) out.push({ date, state: 'done' })
    else if (date === today) out.push({ date, state: 'future' }) // pas encore manqué
    else out.push({ date, state: 'missed' })
  }
  return out
}

/** Lundi de la semaine d'une date civile. */
export function mondayOf(date: string): string {
  return addDays(date, -(isoWeekday(date) - 1))
}

/** Progrès de la semaine en cours pour un objectif « X fois par semaine ». */
export function weeklyProgress(r: Routine, logs: RoutineLog[], today: string): { done: number; target: number } {
  const target = r.timesPerWeek ?? 0
  const monday = mondayOf(today)
  let done = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    if (date > today) break
    if (isDone(logs, r.id, date)) done++
  }
  return { done, target }
}

/** Semaines consécutives (avant celle-ci) où l'objectif hebdo a été atteint. */
export function weeklyTargetStreak(r: Routine, logs: RoutineLog[], today: string): number {
  const target = r.timesPerWeek ?? 0
  if (target <= 0) return 0
  let streak = 0
  let monday = addDays(mondayOf(today), -7)
  for (let w = 0; w < 52; w++) {
    if (r.createdAt && addDays(monday, 6) < r.createdAt.slice(0, 10)) break
    let done = 0
    for (let i = 0; i < 7; i++) if (isDone(logs, r.id, addDays(monday, i))) done++
    if (done >= target) streak++
    else break
    monday = addDays(monday, -7)
  }
  return streak
}

/** Meilleure série jamais atteinte (fenêtre d'un an). */
export function bestStreakEver(r: Routine, logs: RoutineLog[], today: string): number {
  let best = 0, cur = 0
  for (let i = 365; i >= 0; i--) {
    const date = addDays(today, -i)
    if (!isScheduled(r, date)) continue
    if (isDone(logs, r.id, date)) { cur++; best = Math.max(best, cur) }
    else if (date !== today) cur = 0
  }
  return best
}

/** Pour le graphique : % d'habitudes prévues faites, jour par jour (7 derniers jours). */
export function dailyCompletion(routines: Routine[], logs: RoutineLog[], today: string, days = 7): Array<{ date: string; rate: number | null }> {
  const active = routines.filter(r => !r.archived)
  const out: Array<{ date: string; rate: number | null }> = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const scheduled = active.filter(r => isScheduled(r, date))
    if (scheduled.length === 0) { out.push({ date, rate: null }); continue }
    const done = scheduled.filter(r => isDone(logs, r.id, date)).length
    out.push({ date, rate: done / scheduled.length })
  }
  return out
}
