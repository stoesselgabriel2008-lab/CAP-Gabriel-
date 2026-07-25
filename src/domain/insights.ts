// Insights : rares, seuil de données explicite, tendance ≠ causalité.

import type { AppState } from './types'
import { addDays, daysBetween } from '../lib/dates'

export interface Insight {
  id: string
  text: string
  sample: string // taille d'échantillon affichée
}

export const MIN_OBSERVATIONS = 5

export function computeInsights(state: AppState, today: string): Insight[] {
  const insights: Insight[] = []
  const since14 = addDays(today, -14)

  // 1. Focus matin vs après-midi (sessions notées, 14 derniers jours)
  const rated = state.focusSessions.filter(s =>
    s.focusQuality != null && s.endedAt && s.startedAt >= new Date(since14 + 'T00:00:00Z').toISOString()
  )
  const morning = rated.filter(s => new Date(s.startedAt).getUTCHours() + 1 < 12) // approx. Paris
  const afternoon = rated.filter(s => new Date(s.startedAt).getUTCHours() + 1 >= 12)
  if (morning.length >= MIN_OBSERVATIONS && afternoon.length >= MIN_OBSERVATIONS) {
    const avg = (arr: typeof rated) => arr.reduce((a, s) => a + (s.focusQuality ?? 0), 0) / arr.length
    const diff = avg(morning) - avg(afternoon)
    if (Math.abs(diff) >= 0.5) {
      const better = diff > 0 ? 'le matin' : "l'après-midi"
      insights.push({
        id: 'focus-time',
        text: `Sur 14 jours, tes sessions ${better} ont été notées ${Math.abs(diff).toFixed(1)} point de plus en focus. Association, pas causalité — teste encore une semaine.`,
        sample: `${morning.length + afternoon.length} sessions notées`
      })
    }
  }

  // 2. Sommeil ressenti vs qualité de focus le lendemain
  const checkIns = state.checkIns.filter(c => daysBetween(c.date, today) <= 14)
  const goodSleepDays = new Set(checkIns.filter(c => c.sleepFelt === 'bon').map(c => c.date))
  const badSleepDays = new Set(checkIns.filter(c => c.sleepFelt === 'mauvais').map(c => c.date))
  if (goodSleepDays.size >= MIN_OBSERVATIONS && badSleepDays.size >= MIN_OBSERVATIONS) {
    insights.push({
      id: 'sleep-days',
      text: `Sur 14 jours : ${goodSleepDays.size} jours avec bon sommeil ressenti, ${badSleepDays.size} avec mauvais. Regarde ce qui distingue les veilles de bons jours.`,
      sample: `${checkIns.length} check-ins`
    })
  }

  // 3. Déclencheurs d'envie dominants
  const urges = state.urgeEvents.filter(u => u.trigger && daysBetween(u.at.slice(0, 10), today) <= 30)
  if (urges.length >= MIN_OBSERVATIONS) {
    const byTrigger = new Map<string, number>()
    for (const u of urges) byTrigger.set(u.trigger, (byTrigger.get(u.trigger) ?? 0) + 1)
    const top = [...byTrigger.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 3) {
      insights.push({
        id: 'trigger',
        text: `Sur 30 jours, "${top[0]}" revient dans ${top[1]} envies sur ${urges.length}. Un plan "si… alors…" ciblé sur ce contexte est probablement le plus rentable.`,
        sample: `${urges.length} envies notées`
      })
    }
  }

  return insights.slice(0, 3)
}

export function notEnoughDataMessage(): string {
  return `Pas encore assez de données pour une tendance fiable (minimum ${MIN_OBSERVATIONS} observations sur 7 à 14 jours). Continue simplement à utiliser Cap.`
}
