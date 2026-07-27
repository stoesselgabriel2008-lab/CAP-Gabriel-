// Tâches récurrentes : terminer une occurrence crée la suivante.
// La récurrence se base sur la date prévue (ou aujourd'hui si dépassée),
// jamais sur la date de complétion — une tâche du lundi reste du lundi.

import { addDays, nowISO } from '../lib/dates'
import { newId } from '../lib/id'
import type { AppState, Task } from './types'

export type Repeat = NonNullable<Task['repeat']>

const pad = (n: number) => String(n).padStart(2, '0')

/** Prochaine date d'une récurrence à partir d'une date de base (civile). */
export function nextOccurrence(base: string, repeat: Repeat): string {
  if (repeat === 'daily') return addDays(base, 1)
  if (repeat === 'weekly') return addDays(base, 7)
  // mensuel : même quantième le mois suivant, plafonné à la fin du mois
  const [y, m, d] = base.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  return `${ny}-${pad(nm)}-${pad(Math.min(d, lastDay))}`
}

/** Termine une tâche ; si elle est récurrente, ajoute l'occurrence suivante. */
export function completeTask(s: AppState, id: string, today: string): AppState {
  const t = s.tasks.find(x => x.id === id)
  if (!t || t.done) return s
  let tasks = s.tasks.map(x => x.id === id ? { ...x, done: true, completedAt: nowISO() } : x)
  if (t.repeat) {
    const base = t.plannedDate && t.plannedDate >= today ? t.plannedDate : today
    const next: Task = {
      ...t,
      id: newId('task'),
      plannedDate: nextOccurrence(base, t.repeat),
      done: false,
      completedAt: null,
      createdAt: nowISO(),
      top3Rank: null,
      top3Date: null,
      deletedAt: null
    }
    tasks = [...tasks, next]
  }
  return { ...s, tasks }
}
