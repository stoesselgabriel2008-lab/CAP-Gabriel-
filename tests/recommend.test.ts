import { describe, it, expect } from 'vitest'
import { recommend } from '../src/domain/recommend'
import { defaultState } from '../src/domain/types'
import { createPlan } from '../src/domain/srs'
import type { AppState } from '../src/domain/types'

// 10h00 heure de Paris un mercredi de septembre (UTC+2)
const MORNING = new Date('2026-09-16T08:00:00Z')
const NIGHT = new Date('2026-09-16T20:30:00Z') // 22h30 Paris
const TODAY = '2026-09-16'

function withCheckIn(s: AppState, urge: number, energy: 'basse' | 'moyenne' | 'haute'): AppState {
  return {
    ...s,
    checkIns: [{ id: 'c1', date: TODAY, at: '2026-09-16T07:00:00Z', energy, stress: 'moyen', sleepFelt: 'moyen', urge, mood: '' }]
  }
}

describe('moteur de recommandation', () => {
  it('minuteur actif : toujours prioritaire', () => {
    let s = withCheckIn(defaultState(), 9, 'haute')
    s = {
      ...s,
      activeTimer: {
        label: 'Anatomie', taskId: null, unitId: null, goal: '', plannedMin: 25,
        startedAt: '2026-09-16T07:50:00Z', targetEndAt: '2026-09-16T08:15:00Z',
        pausedAt: null, totalPausedMs: 0, interruptions: 0
      }
    }
    expect(recommend(s, MORNING).action.kind).toBe('open-timer')
  })

  it('envie ≥ 8 → SOS', () => {
    const s = withCheckIn(defaultState(), 8, 'haute')
    const r = recommend(s, MORNING)
    expect(r.action.kind).toBe('sos')
    expect(r.why).toContain('8/10')
  })

  it('sans check-in → check-in', () => {
    expect(recommend(defaultState(), MORNING).action.kind).toBe('checkin')
  })

  it('soirée sans fermeture → fermeture du soir', () => {
    const s = withCheckIn(defaultState(), 0, 'moyenne')
    expect(recommend(s, NIGHT).action.kind).toBe('evening')
  })

  it('révisions dues + énergie basse → 25 min', () => {
    let s = withCheckIn(defaultState(), 0, 'basse')
    s = {
      ...s,
      subjects: [{ id: 's1', name: 'Anatomie', examDate: null, createdAt: '' }],
      studyUnits: [{ id: 'u1', subjectId: 's1', name: 'Membre sup', kind: 'spatial', mastery: 0, source: '', createdAt: '', archived: false }],
      reviewPlans: [createPlan('u1', TODAY)]
    }
    const r = recommend(s, MORNING)
    expect(r.action.kind).toBe('focus')
    expect((r.action as any).minutes).toBe(25)
    expect(r.why).toContain('Énergie basse')
  })

  it('révisions dues + énergie haute → 50 min', () => {
    let s = withCheckIn(defaultState(), 0, 'haute')
    s = {
      ...s,
      subjects: [{ id: 's1', name: 'Anatomie', examDate: null, createdAt: '' }],
      studyUnits: [{ id: 'u1', subjectId: 's1', name: 'Membre sup', kind: 'spatial', mastery: 0, source: '', createdAt: '', archived: false }],
      reviewPlans: [createPlan('u1', TODAY)]
    }
    const r = recommend(s, MORNING)
    expect(r.action.kind).toBe('focus')
    expect((r.action as any).minutes).toBe(50)
  })

  it('examen proche + erreurs non retestées → journal d\'erreurs', () => {
    let s = withCheckIn(defaultState(), 0, 'moyenne')
    s = {
      ...s,
      subjects: [{ id: 's1', name: 'Maths', examDate: '2026-09-22', createdAt: '' }],
      errorLogs: [{ id: 'e1', subjectId: 's1', error: 'x', cause: '', rule: '', retestOn: null, retested: false, createdAt: '' }]
    }
    expect(recommend(s, MORNING).action.kind).toBe('error-journal')
  })

  it('inbox chargée sans révisions → clarifier', () => {
    let s = withCheckIn(defaultState(), 0, 'moyenne')
    s = {
      ...s,
      captures: [1, 2, 3].map(i => ({ id: `c${i}`, text: `item ${i}`, kind: null, createdAt: '', processedAt: null }))
    }
    expect(recommend(s, MORNING).action.kind).toBe('inbox')
  })

  it('chaque recommandation a un pourquoi', () => {
    const r = recommend(withCheckIn(defaultState(), 0, 'moyenne'), MORNING)
    expect(r.why.length).toBeGreaterThan(10)
  })
})
