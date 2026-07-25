import { describe, it, expect } from 'vitest'
import { exportBackup, validateImport, sanitizeState, mergeStates } from '../src/domain/backup'
import { defaultState } from '../src/domain/types'

describe('export / import', () => {
  it('l\'export a le format documenté', () => {
    const b = exportBackup(defaultState())
    expect(b.format).toBe('cap-gabriel-backup')
    expect(b.schemaVersion).toBe(1)
    expect(b.timezone).toBe('Europe/Paris')
    expect(b.data.profile.firstName).toBe('Gabriel')
  })

  it('un export réimporté est valide et complet', () => {
    const state = defaultState()
    state.tasks.push({
      id: 't1', title: 'Test', note: '', plannedDate: null, deadline: null, plannedTime: null,
      durationMin: null, energy: null, priority: 'normale', projectId: null, subjectId: null,
      someday: false, top3Rank: null, top3Date: null, done: false,
      createdAt: '2026-07-25T10:00:00Z', completedAt: null, deletedAt: null
    })
    const roundTrip = validateImport(JSON.parse(JSON.stringify(exportBackup(state))))
    expect(roundTrip.valid).toBe(true)
    expect(roundTrip.counts.tasks).toBe(1)
    expect(roundTrip.state?.tasks[0].title).toBe('Test')
  })

  it('rejette un fichier étranger sans modifier quoi que ce soit', () => {
    expect(validateImport({ hello: 'world' }).valid).toBe(false)
    expect(validateImport(null).valid).toBe(false)
    expect(validateImport('texte').valid).toBe(false)
    expect(validateImport({ format: 'autre-app', data: {} }).valid).toBe(false)
  })

  it('rejette un schéma plus récent', () => {
    const r = validateImport({ format: 'cap-gabriel-backup', schemaVersion: 99, data: defaultState() })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('version plus récente')
  })

  it('sanitizeState répare les champs invalides sans planter', () => {
    const s = sanitizeState({
      profile: { firstName: '', birthDate: 'invalid', timezone: '', priority: 'xx', wakeTarget: '99h' } as any,
      tasks: [{ id: 't1' }, { notAnItem: true }, null] as any
    })
    expect(s.profile.firstName).toBe('Gabriel')
    expect(s.profile.birthDate).toBe('2008-07-29')
    expect(s.tasks.length).toBe(1)
    expect(s.activeTimer).toBeNull()
  })

  it('la fusion ajoute sans écraser et garde le meilleur record', () => {
    const a = defaultState()
    a.commitment.bestStreak = 10
    a.checkIns.push({ id: 'c1', date: '2026-07-20', at: '', energy: 'haute', stress: 'bas', sleepFelt: 'bon', urge: 0, mood: '' })
    const b = defaultState()
    b.commitment.bestStreak = 25
    b.checkIns.push({ id: 'c1', date: '2026-07-20', at: '', energy: 'basse', stress: 'haut', sleepFelt: 'mauvais', urge: 5, mood: '' })
    b.checkIns.push({ id: 'c2', date: '2026-07-21', at: '', energy: 'moyenne', stress: 'moyen', sleepFelt: 'moyen', urge: 2, mood: '' })
    const merged = mergeStates(a, b)
    expect(merged.checkIns.length).toBe(2)
    expect(merged.checkIns.find(c => c.id === 'c1')?.energy).toBe('haute') // l'existant gagne
    expect(merged.commitment.bestStreak).toBe(25)
  })
})
