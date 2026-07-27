// Interprétation légère du langage naturel dans la capture :
// « réviser anatomie vendredi 17h30 » → titre nettoyé + date + heure.
// Volontairement simple et prévisible : mots-clés français, pas d'IA.

import { addDays, isoWeekday } from './dates'

const DAYS: Record<string, number> = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7
}

export interface ParsedCapture {
  title: string
  date: string | null // civile "YYYY-MM-DD"
  time: string | null // "HH:MM"
}

export function parseCapture(text: string, today: string): ParsedCapture {
  let title = text
  let date: string | null = null
  let time: string | null = null

  const RX_APRES_DEMAIN = /\bapr[eè]s[- ]?demain\b/i
  const RX_DEMAIN = /\bdemain\b/i
  const RX_AUJOURDHUI = /\baujourd['']?hui\b/i
  const RX_JOUR = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i

  if (RX_APRES_DEMAIN.test(title)) {
    date = addDays(today, 2)
    title = title.replace(RX_APRES_DEMAIN, ' ')
  } else if (RX_DEMAIN.test(title)) {
    date = addDays(today, 1)
    title = title.replace(RX_DEMAIN, ' ')
  } else if (RX_AUJOURDHUI.test(title)) {
    date = today
    title = title.replace(RX_AUJOURDHUI, ' ')
  } else {
    const m = title.match(RX_JOUR)
    if (m) {
      const target = DAYS[m[1].toLowerCase()]
      const delta = (target - isoWeekday(today) + 7) % 7
      // « vendredi » dit un vendredi = vendredi prochain
      date = addDays(today, delta === 0 ? 7 : delta)
      title = title.replace(RX_JOUR, ' ')
    }
  }

  // Heure : « 17h », « 17h30 », « 9 h 05 »
  const tm = title.match(/(?:^|\s)(\d{1,2})\s?h\s?([0-5]\d)?(?=\s|$|[.,;!?])/i)
  if (tm) {
    const h = parseInt(tm[1], 10)
    if (h <= 23) {
      time = `${String(h).padStart(2, '0')}:${tm[2] ?? '00'}`
      title = title.replace(tm[0], ' ')
    }
  }

  title = title.replace(/\s{2,}/g, ' ').trim()
  return { title: title || text.trim(), date, time }
}
