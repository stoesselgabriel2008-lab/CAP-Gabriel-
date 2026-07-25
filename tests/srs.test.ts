import { describe, it, expect } from 'vitest'
import { createPlan, applyReview, dueQueue } from '../src/domain/srs'
import type { ReviewPlan } from '../src/domain/types'

describe('Méthode des J', () => {
  it('J0 : le plan est dû le jour de l\'apprentissage', () => {
    const plan = createPlan('u1', '2026-09-01')
    expect(plan.nextDue).toBe('2026-09-01')
    expect(plan.stage).toBe(0)
  })

  it('moyen suit la séquence J1, J3, J7, J14, J30', () => {
    let plan = createPlan('u1', '2026-09-01')
    // J0 = 01/09 → J1 = 02/09, J3 = 04/09, J7 = 08/09, J14 = 15/09, J30 = 01/10
    const expected = ['2026-09-02', '2026-09-04', '2026-09-08', '2026-09-15', '2026-10-01']
    let today = '2026-09-01'
    for (const due of expected) {
      const out = applyReview(plan, 'moyen', today)
      expect(out.nextDue).toBe(due)
      plan = { ...plan, stage: out.stage, intervalDays: out.intervalDays, nextDue: out.nextDue }
      today = out.nextDue
    }
  })

  it('facile allonge prudemment', () => {
    const plan = createPlan('u1', '2026-09-01')
    const out = applyReview({ ...plan, stage: 2 }, 'facile', '2026-09-05')
    // base J3→J7 = 4 jours, ×1.25 = 5
    expect(out.intervalDays).toBe(5)
    expect(out.stage).toBe(3)
  })

  it('difficile rapproche sans progresser', () => {
    const plan = createPlan('u1', '2026-09-01')
    const out = applyReview({ ...plan, stage: 3 }, 'difficile', '2026-09-12')
    // base J7→J14 = 7 jours, ×0.5 = 4 (arrondi)
    expect(out.stage).toBe(3)
    expect(out.intervalDays).toBeLessThanOrEqual(4)
    expect(out.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('oublié revient à demain et recule d\'une étape', () => {
    const plan = createPlan('u1', '2026-09-01')
    const out = applyReview({ ...plan, stage: 4 }, 'oublie', '2026-09-26')
    expect(out.stage).toBe(3)
    expect(out.nextDue).toBe('2026-09-27')
  })

  it('l\'intervalle est plafonné', () => {
    const plan = createPlan('u1', '2026-01-01')
    const out = applyReview({ ...plan, stage: 10 }, 'facile', '2026-06-01')
    expect(out.intervalDays).toBeLessThanOrEqual(60)
  })

  it('la file due trie par retard, examen et difficulté', () => {
    const mk = (id: string, unitId: string, nextDue: string): ReviewPlan => ({
      id, unitId, learnedOn: '2026-09-01', stage: 1, intervalDays: 1, nextDue, active: true, createdAt: ''
    })
    const plans = [
      mk('p1', 'u1', '2026-09-10'), // dû aujourd'hui
      mk('p2', 'u2', '2026-09-08'), // dû depuis 2 j + examen proche
      mk('p3', 'u3', '2026-09-11') // pas encore dû
    ]
    const exams = new Map([['u2', '2026-09-22'], ['u1', null], ['u3', null]])
    const ratings = new Map()
    const queue = dueQueue(plans, '2026-09-10', exams as any, ratings)
    expect(queue.length).toBe(2)
    expect(queue[0].plan.id).toBe('p2')
    expect(queue[0].why).toContain('dû depuis 2 j')
    expect(queue[0].why).toContain('examen dans 12 j')
  })
})
