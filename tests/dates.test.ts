import { describe, it, expect } from 'vitest'
import { civilDateOf, daysBetween, addDays, ageAt, isValidCivil, isoWeekday, formatDuration } from '../src/lib/dates'

describe('dates civiles Europe/Paris', () => {
  it('convertit un instant en date civile Paris', () => {
    // 23h30 UTC le 12 juillet = 01h30 Paris le 13 juillet (été, UTC+2)
    expect(civilDateOf(new Date('2026-07-12T23:30:00Z'), 'Europe/Paris')).toBe('2026-07-13')
    // 23h30 UTC le 12 janvier = 00h30 Paris le 13 janvier (hiver, UTC+1)
    expect(civilDateOf(new Date('2026-01-12T23:30:00Z'), 'Europe/Paris')).toBe('2026-01-13')
    // 22h30 UTC en hiver reste le même jour à Paris
    expect(civilDateOf(new Date('2026-01-12T22:30:00Z'), 'Europe/Paris')).toBe('2026-01-12')
  })

  it('daysBetween traverse le changement d\'heure sans dérive', () => {
    // le passage à l'heure d'été 2026 est le 29 mars
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2) // heure d'hiver le 25 oct
  })

  it('daysBetween gère l\'année bissextile', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2) // 2028 bissextile
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1)
  })

  it('addDays traverse les mois et années', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-07-12', 30)).toBe('2026-08-11')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('calcule l\'âge en années révolues', () => {
    expect(ageAt('2008-07-29', '2026-07-28')).toBe(17)
    expect(ageAt('2008-07-29', '2026-07-29')).toBe(18)
    expect(ageAt('2008-07-29', '2026-07-30')).toBe(18)
  })

  it('valide les dates civiles', () => {
    expect(isValidCivil('2026-07-12')).toBe(true)
    expect(isValidCivil('2026-02-30')).toBe(false)
    expect(isValidCivil('2026-13-01')).toBe(false)
    expect(isValidCivil('12/07/2026')).toBe(false)
  })

  it('isoWeekday : lundi = 1, dimanche = 7', () => {
    expect(isoWeekday('2026-07-13')).toBe(1) // lundi
    expect(isoWeekday('2026-07-12')).toBe(7) // dimanche
  })

  it('formate les durées', () => {
    expect(formatDuration(25 * 60000)).toBe('25:00')
    expect(formatDuration(90 * 60000)).toBe('1:30:00')
    expect(formatDuration(-5000)).toBe('0:00')
  })
})
