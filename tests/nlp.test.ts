import { describe, it, expect } from 'vitest'
import { parseCapture } from '../src/lib/nlp'
import { nextOccurrence } from '../src/domain/repeat'

// 2026-07-27 est un lundi
const TODAY = '2026-07-27'

describe('parseCapture', () => {
  it('détecte « demain »', () => {
    const r = parseCapture('Réviser anatomie demain', TODAY)
    expect(r).toEqual({ title: 'Réviser anatomie', date: '2026-07-28', time: null })
  })

  it('détecte « après-demain »', () => {
    const r = parseCapture('Rendre le dossier après-demain', TODAY)
    expect(r.date).toBe('2026-07-29')
    expect(r.title).toBe('Rendre le dossier')
  })

  it('détecte un jour de la semaine (prochain vendredi)', () => {
    const r = parseCapture('DST physio vendredi', TODAY)
    expect(r.date).toBe('2026-07-31')
    expect(r.title).toBe('DST physio')
  })

  it('même jour de semaine → semaine suivante', () => {
    const r = parseCapture('Bilan lundi', TODAY)
    expect(r.date).toBe('2026-08-03')
  })

  it('détecte une heure « 17h30 »', () => {
    const r = parseCapture('Cours en ligne demain 17h30', TODAY)
    expect(r.date).toBe('2026-07-28')
    expect(r.time).toBe('17:30')
    expect(r.title).toBe('Cours en ligne')
  })

  it('heure seule « 9h »', () => {
    const r = parseCapture('Footing 9h', TODAY)
    expect(r).toEqual({ title: 'Footing', date: null, time: '09:00' })
  })

  it('ne casse pas un texte sans mots-clés', () => {
    const r = parseCapture('Acheter des fiches bristol', TODAY)
    expect(r).toEqual({ title: 'Acheter des fiches bristol', date: null, time: null })
  })

  it('ignore les heures impossibles', () => {
    const r = parseCapture('Objectif 30h de focus', TODAY)
    expect(r.time).toBeNull()
    expect(r.title).toBe('Objectif 30h de focus')
  })
})

describe('nextOccurrence', () => {
  it('quotidien et hebdomadaire', () => {
    expect(nextOccurrence('2026-07-27', 'daily')).toBe('2026-07-28')
    expect(nextOccurrence('2026-07-27', 'weekly')).toBe('2026-08-03')
  })

  it('mensuel avec plafond de fin de mois', () => {
    expect(nextOccurrence('2026-07-15', 'monthly')).toBe('2026-08-15')
    expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextOccurrence('2026-12-10', 'monthly')).toBe('2027-01-10')
  })
})
