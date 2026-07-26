import { describe, it, expect } from 'vitest'
import { isScheduled, habitStreak, completionRate, dayStates, dailyCompletion, weeklyProgress, weeklyTargetStreak, bestStreakEver, mondayOf } from '../src/domain/habits'
import type { Routine, RoutineLog } from '../src/domain/types'

const daily: Routine = { id: 'h1', name: 'Lecture', schedule: 'daily', customDays: [], negative: false, archived: false, createdAt: '' }
const weekdays: Routine = { ...daily, id: 'h2', schedule: 'weekdays' }
const custom: Routine = { ...daily, id: 'h3', schedule: 'custom', customDays: [1, 3, 5] } // lun mer ven

const log = (routineId: string, date: string, done = true): RoutineLog =>
  ({ id: `${routineId}-${date}`, routineId, date, done })

describe('habitudes', () => {
  it('planification : daily, weekdays, custom', () => {
    expect(isScheduled(daily, '2026-07-25')).toBe(true) // samedi
    expect(isScheduled(weekdays, '2026-07-25')).toBe(false) // samedi
    expect(isScheduled(weekdays, '2026-07-24')).toBe(true) // vendredi
    expect(isScheduled(custom, '2026-07-24')).toBe(true) // vendredi (5)
    expect(isScheduled(custom, '2026-07-23')).toBe(false) // jeudi (4)
    expect(isScheduled({ ...daily, archived: true }, '2026-07-24')).toBe(false)
  })

  it('série : consécutifs faits, aujourd\'hui non fait ne casse pas', () => {
    const logs = [log('h1', '2026-07-24'), log('h1', '2026-07-23'), log('h1', '2026-07-22')]
    expect(habitStreak(daily, logs, '2026-07-25')).toBe(3) // aujourd'hui pas encore fait
    expect(habitStreak(daily, [...logs, log('h1', '2026-07-25')], '2026-07-25')).toBe(4)
    // trou le 23 → série = 1 (le 24)
    const gap = [log('h1', '2026-07-24'), log('h1', '2026-07-22')]
    expect(habitStreak(daily, gap, '2026-07-25')).toBe(1)
  })

  it('série weekdays : le week-end ne casse pas', () => {
    // vendredi 24 et jeudi 23 faits, on est dimanche 26
    const logs = [log('h2', '2026-07-24'), log('h2', '2026-07-23')]
    expect(habitStreak(weekdays, logs, '2026-07-26')).toBe(2)
  })

  it('taux de complétion sur fenêtre', () => {
    const logs = [log('h1', '2026-07-25'), log('h1', '2026-07-24'), log('h1', '2026-07-23')]
    const c = completionRate(daily, logs, '2026-07-25', 5)
    expect(c.scheduled).toBe(5)
    expect(c.done).toBe(3)
    expect(c.rate).toBeCloseTo(0.6)
  })

  it('grille : off / done / missed / future', () => {
    const logs = [log('h2', '2026-07-24')]
    const states = dayStates(weekdays, logs, '2026-07-26', 4) // je 23 → di 26
    expect(states.map(s => s.state)).toEqual(['missed', 'done', 'off', 'off'])
  })

  it('objectif hebdo : progrès et série de semaines', () => {
    const weekly: Routine = { ...daily, id: 'h4', timesPerWeek: 3 }
    // semaine du lundi 20 juillet 2026 ; aujourd'hui samedi 25
    expect(mondayOf('2026-07-25')).toBe('2026-07-20')
    const logs = [log('h4', '2026-07-21'), log('h4', '2026-07-23')]
    expect(weeklyProgress(weekly, logs, '2026-07-25')).toEqual({ done: 2, target: 3 })
    // semaine précédente (13-19) : 3 faits → série 1
    const prev = [...logs, log('h4', '2026-07-14'), log('h4', '2026-07-15'), log('h4', '2026-07-17')]
    expect(weeklyTargetStreak(weekly, prev, '2026-07-25')).toBe(1)
    expect(weeklyTargetStreak(weekly, logs, '2026-07-25')).toBe(0)
  })

  it('meilleure série jamais atteinte', () => {
    const logs = [
      log('h1', '2026-07-10'), log('h1', '2026-07-11'), log('h1', '2026-07-12'), // série 3
      log('h1', '2026-07-24') // série 1
    ]
    expect(bestStreakEver(daily, logs, '2026-07-25')).toBe(3)
  })

  it('complétion quotidienne globale pour le graphique', () => {
    const routines = [daily, weekdays]
    const logs = [log('h1', '2026-07-24'), log('h2', '2026-07-24'), log('h1', '2026-07-25')]
    const days = dailyCompletion(routines, logs, '2026-07-25', 2)
    expect(days[0].rate).toBe(1) // vendredi 24 : 2 prévues, 2 faites
    expect(days[1].rate).toBe(1) // samedi 25 : seule daily est prévue, et elle est faite
  })
})
