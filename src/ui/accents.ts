// Couleurs d'accent préréglées (palette système iOS). La teinte choisie
// se propage partout via --tint : boutons, bulle, graphiques, heatmaps…

export interface Accent {
  id: string
  name: string
  color: string
}

export const ACCENTS: Accent[] = [
  { id: 'bleu', name: 'Bleu', color: '#0a84ff' },
  { id: 'indigo', name: 'Indigo', color: '#5e5ce6' },
  { id: 'violet', name: 'Violet', color: '#bf5af2' },
  { id: 'rose', name: 'Rose', color: '#ff375f' },
  { id: 'orange', name: 'Orange', color: '#ff9f0a' },
  { id: 'vert', name: 'Vert', color: '#30d158' },
  { id: 'turquoise', name: 'Turquoise', color: '#3fc2dd' },
  { id: 'graphite', name: 'Graphite', color: '#98989d' }
]

export function accentColor(id: string): string {
  return ACCENTS.find(a => a.id === id)?.color ?? ACCENTS[0].color
}
