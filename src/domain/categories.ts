// Catégories de tâches : couleur voyante + libellé court, façon Google Agenda.

export interface TaskCategory {
  id: string
  label: string
  color: string
}

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'devoir', label: 'Devoir', color: '#0a84ff' },
  { id: 'dst', label: 'DST', color: '#ff453a' },
  { id: 'cours', label: 'Cours', color: '#bf5af2' },
  { id: 'revision', label: 'Révision', color: '#30d158' },
  { id: 'perso', label: 'Perso', color: '#ff9f0a' },
  { id: 'admin', label: 'Admin', color: '#98989d' }
]

export function categoryOf(id: string | null | undefined): TaskCategory | null {
  if (!id) return null
  return TASK_CATEGORIES.find(c => c.id === id) ?? null
}

export function priorityColor(priority: 'basse' | 'normale' | 'haute'): string {
  return priority === 'haute' ? '#ff453a' : priority === 'basse' ? '#98989d' : '#0a84ff'
}

/** Couleur de la barre latérale : catégorie, sinon neutre discret. */
export function categoryBarColor(category: string | null | undefined): string {
  return categoryOf(category)?.color ?? 'var(--opaque-separator)'
}

/** Couleur de pastille (calendrier) : catégorie sinon priorité. */
export function taskColor(category: string | null | undefined, priority: 'basse' | 'normale' | 'haute'): string {
  return categoryOf(category)?.color ?? priorityColor(priority)
}
