// Minuteur fondé sur des timestamps : le temps restant est toujours recalculé
// à partir de targetEndAt. Aucune dépendance à setInterval pour l'exactitude —
// l'interval ne sert qu'au rafraîchissement de l'affichage.

import type { ActiveTimer } from './types'
import { newId } from '../lib/id'
import { nowISO } from '../lib/dates'

export function startTimer(opts: {
  label: string
  taskId?: string | null
  unitId?: string | null
  goal?: string
  plannedMin: number
  now?: Date
}): ActiveTimer {
  const now = opts.now ?? new Date()
  return {
    label: opts.label,
    taskId: opts.taskId ?? null,
    unitId: opts.unitId ?? null,
    goal: opts.goal ?? '',
    plannedMin: opts.plannedMin,
    startedAt: now.toISOString(),
    targetEndAt: new Date(now.getTime() + opts.plannedMin * 60000).toISOString(),
    pausedAt: null,
    totalPausedMs: 0,
    interruptions: 0
  }
}

export function pauseTimer(t: ActiveTimer, now: Date = new Date()): ActiveTimer {
  if (t.pausedAt) return t
  return { ...t, pausedAt: now.toISOString() }
}

export function resumeTimer(t: ActiveTimer, now: Date = new Date()): ActiveTimer {
  if (!t.pausedAt) return t
  const pausedMs = now.getTime() - new Date(t.pausedAt).getTime()
  return {
    ...t,
    pausedAt: null,
    totalPausedMs: t.totalPausedMs + pausedMs,
    // la cible recule du temps de pause : pas de temps fictif perdu ni gagné
    targetEndAt: new Date(new Date(t.targetEndAt).getTime() + pausedMs).toISOString()
  }
}

/** Temps restant en ms, recalculé. Négatif ou 0 si terminé. */
export function remainingMs(t: ActiveTimer, now: Date = new Date()): number {
  const ref = t.pausedAt ? new Date(t.pausedAt).getTime() : now.getTime()
  return new Date(t.targetEndAt).getTime() - ref
}

export function isFinished(t: ActiveTimer, now: Date = new Date()): boolean {
  return remainingMs(t, now) <= 0
}

/** Minutes réellement travaillées (hors pauses), plafonnées à la durée prévue. */
export function workedMin(t: ActiveTimer, now: Date = new Date()): number {
  const end = Math.min(now.getTime(), new Date(t.targetEndAt).getTime())
  const raw = end - new Date(t.startedAt).getTime() - t.totalPausedMs
    - (t.pausedAt ? now.getTime() - new Date(t.pausedAt).getTime() : 0)
  return Math.max(0, Math.min(t.plannedMin, Math.round(raw / 60000)))
}

export function sessionIdFromTimer(): string {
  return newId('focus')
}

export { nowISO }
