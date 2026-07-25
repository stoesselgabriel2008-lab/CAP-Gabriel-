import { describe, it, expect } from 'vitest'
import { startTimer, pauseTimer, resumeTimer, remainingMs, isFinished, workedMin } from '../src/domain/timer'

describe('minuteur à timestamps', () => {
  const t0 = new Date('2026-09-10T10:00:00Z')

  it('démarre avec la bonne cible', () => {
    const t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    expect(remainingMs(t, t0)).toBe(25 * 60000)
  })

  it('reste exact après suspension (recalcul par timestamps)', () => {
    const t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    // 10 minutes plus tard (peu importe si la page était suspendue)
    const later = new Date(t0.getTime() + 10 * 60000)
    expect(remainingMs(t, later)).toBe(15 * 60000)
  })

  it('se termine après la durée prévue, sans temps fictif', () => {
    const t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    const after = new Date(t0.getTime() + 26 * 60000)
    expect(isFinished(t, after)).toBe(true)
    expect(workedMin(t, after)).toBe(25)
  })

  it('la pause gèle le temps restant', () => {
    let t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    const at5 = new Date(t0.getTime() + 5 * 60000)
    t = pauseTimer(t, at5)
    // 30 minutes de pause
    const at35 = new Date(t0.getTime() + 35 * 60000)
    expect(remainingMs(t, at35)).toBe(20 * 60000)
    // reprise : la cible recule du temps de pause
    t = resumeTimer(t, at35)
    expect(remainingMs(t, at35)).toBe(20 * 60000)
    const at40 = new Date(t0.getTime() + 40 * 60000)
    expect(remainingMs(t, at40)).toBe(15 * 60000)
  })

  it('workedMin exclut les pauses', () => {
    let t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    const at10 = new Date(t0.getTime() + 10 * 60000)
    t = pauseTimer(t, at10)
    const at20 = new Date(t0.getTime() + 20 * 60000)
    t = resumeTimer(t, at20)
    const at30 = new Date(t0.getTime() + 30 * 60000)
    expect(workedMin(t, at30)).toBe(20)
  })

  it('double pause / double reprise sont sans effet', () => {
    let t = startTimer({ label: 'Test', plannedMin: 25, now: t0 })
    const at5 = new Date(t0.getTime() + 5 * 60000)
    t = pauseTimer(t, at5)
    const t2 = pauseTimer(t, new Date(t0.getTime() + 6 * 60000))
    expect(t2).toEqual(t)
    t = resumeTimer(t, at5)
    const t3 = resumeTimer(t, new Date(t0.getTime() + 6 * 60000))
    expect(t3).toEqual(t)
  })
})
