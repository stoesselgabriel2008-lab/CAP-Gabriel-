// Raccourcis de l'accueil : registre des actions disponibles.
// L'utilisateur choisit lesquels afficher (settings.shortcuts, ordonné).

export interface ShortcutDef {
  id: string
  label: string
  icon: string
  danger?: boolean
  aria?: string // nom accessible complet si le libellé court est ambigu
}

export const SHORTCUT_DEFS: ShortcutDef[] = [
  { id: 'task', label: 'Tâche', icon: 'plus', aria: 'Créer une tâche' },
  { id: 'capture', label: 'Capturer', icon: 'capture' },
  { id: 'checkin', label: 'Check-in', icon: 'bolt' },
  { id: 'sos', label: 'SOS', icon: 'sos', danger: true },
  { id: 'focus', label: 'Focus', icon: 'timer' },
  { id: 'review', label: 'Révisions', icon: 'review' },
  { id: 'calendar', label: 'Calendrier', icon: 'plan' },
  { id: 'habits', label: 'Habitudes', icon: 'check' },
  { id: 'notes', label: 'Notes', icon: 'book' },
  { id: 'search', label: 'Recherche', icon: 'search' },
  { id: 'evening', label: 'Bilan du soir', icon: 'moon' }
]

export const DEFAULT_SHORTCUTS = ['task', 'capture', 'checkin', 'sos']

export function shortcutDef(id: string): ShortcutDef | undefined {
  return SHORTCUT_DEFS.find(d => d.id === id)
}

/** Liste effective : réglage nettoyé (ids connus), sinon défaut. */
export function activeShortcuts(setting: string[] | undefined): string[] {
  const clean = (setting ?? []).filter(id => SHORTCUT_DEFS.some(d => d.id === id))
  return clean.length > 0 ? clean : DEFAULT_SHORTCUTS
}
