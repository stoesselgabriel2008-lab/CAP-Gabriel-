import { describe, it, expect } from 'vitest'
import { currentStreak, bestStreak, afterLapse, alignedDaysLast30 } from '../src/domain/streak'
import type { CommitmentState } from '../src/domain/types'

const base: CommitmentState = { startDate: '2026-07-12', originalStart: '2026-07-12', bestStreak: 0 }

describe('série d\'engagement', () => {
  it('compte les jours depuis le départ', () => {
    expect(currentStreak(base, '2026-07-12')).toBe(0)
    expect(currentStreak(base, '2026-07-25')).toBe(13)
    expect(currentStreak(base, '2026-08-12')).toBe(31)
  })

  it('ne devient jamais négative', () => {
    expect(currentStreak(base, '2026-07-01')).toBe(0)
  })

  it('le record tient compte de la série en cours', () => {
    expect(bestStreak({ ...base, bestStreak: 5 }, '2026-07-25')).toBe(13)
    expect(bestStreak({ ...base, bestStreak: 40 }, '2026-07-25')).toBe(40)
  })

  it('après un écart : record mis à jour, série repart', () => {
    const next = afterLapse(base, '2026-07-25')
    expect(next.bestStreak).toBe(13)
    expect(next.startDate).toBe('2026-07-25')
    expect(next.originalStart).toBe('2026-07-12')
    expect(currentStreak(next, '2026-07-25')).toBe(0)
  })

  it('jours alignés sur 30 jours', () => {
    expect(alignedDaysLast30([], '2026-07-25')).toBe(30)
    const lapse = { id: 'l1', at: '2026-07-20T10:00:00Z', date: '2026-07-20', context: [], lesson: '', protectiveAction: '', previousStreak: 8 }
    expect(alignedDaysLast30([lapse], '2026-07-25')).toBe(29)
    // écart hors fenêtre de 30 jours
    const old = { ...lapse, id: 'l2', date: '2026-05-01' }
    expect(alignedDaysLast30([old], '2026-07-25')).toBe(30)
  })
})
