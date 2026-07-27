// Compteurs de résistance : paliers et phrase du jour.
// La phrase change chaque jour, déterministe (jour + compteur) — pas
// d'aléatoire, pour rester stable dans la journée.

export const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365]

/** Prochain palier strictement au-dessus de `days`. */
export function nextMilestone(days: number): number {
  const m = MILESTONES.find(x => x > days)
  if (m) return m
  return (Math.floor(days / 365) + 1) * 365 // au-delà d'un an : année suivante
}

/** Dernier palier atteint (0 si aucun). */
export function prevMilestone(days: number): number {
  let p = 0
  for (const m of MILESTONES) { if (m <= days) p = m; else break }
  if (days >= 365) p = Math.floor(days / 365) * 365
  return p
}

export function isMilestone(days: number): boolean {
  return days > 0 && (MILESTONES.includes(days) || days % 365 === 0)
}

const PHRASES = [
  'Chaque jour tenu rend le suivant plus facile.',
  'Rien d\'extraordinaire à faire aujourd\'hui : juste ne pas céder.',
  'L\'envie monte, plafonne, puis redescend. Elle passe toujours.',
  'Ce compteur, c\'est toi qui l\'as construit. Personne d\'autre.',
  'Un jour de plus. C\'est exactement comme ça qu\'on y arrive.',
  'La série continue — et c\'est ta décision, pas le hasard.',
  'Chaque jour tenu, l\'ancienne habitude perd du terrain.',
  'Pense à la personne que tu es en train de devenir.',
  'Tenir aujourd\'hui, c\'est le seul objectif. Demain se gérera demain.',
  'Les envies sont des vagues : laisse-les passer, ne plonge pas.',
  'Tu as déjà traversé des jours plus durs que celui-ci.',
  'La discipline d\'aujourd\'hui, c\'est la liberté de demain.',
  'Ce que tu protèges en tenant vaut plus que ce que tu rates.',
  'Jour après jour, tu choisis. Et tu choisis bien.',
  'Si ça devient dur : bouge, respire, change de pièce. Puis reviens fier.',
  'Personne ne le voit, mais toi tu le sais. Et c\'est ça qui compte.'
]

/** Phrase du jour : varie chaque jour et d'un compteur à l'autre. */
export function phraseFor(id: string, days: number): string {
  let h = days
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PHRASES[h % PHRASES.length]
}
