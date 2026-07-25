// Habitudes : création, complétion du jour, séries, taux, grille 28 jours
// et graphique hebdomadaire. Sans culpabilisation : le taux compte autant
// que la série.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { BarChart, DayGrid, ProgressRing } from '../ui/charts'
import { isScheduled, isDone, habitStreak, completionRate, dayStates, dailyCompletion } from '../domain/habits'
import { todayISO, nowISO, relativeLabel } from '../lib/dates'
import { newId } from '../lib/id'
import type { Routine } from '../domain/types'

const DAY_NAMES_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function HabitsView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)
  const [detail, setDetail] = useState<Routine | null>(null)
  const active = state.routines.filter(r => !r.archived)
  const week = useMemo(() => dailyCompletion(state.routines, state.routineLogs, today), [state.routines, state.routineLogs, today])

  const toggle = (r: Routine) => {
    update(s => {
      const existing = s.routineLogs.find(l => l.routineId === r.id && l.date === today)
      return {
        ...s,
        routineLogs: existing
          ? s.routineLogs.map(l => l.id === existing.id ? { ...l, done: !l.done } : l)
          : [...s.routineLogs, { id: newId('rl'), routineId: r.id, date: today, done: true }]
      }
    })
  }

  return (
    <div className="screen">
      <BackHeader title="Habitudes" onBack={() => ui.setSub('plan', null)} action="Nouvelle" onAction={() => setEditing('new')} />

      {active.length === 0 ? (
        <EmptyState title="Aucune habitude">
          Une habitude = une action répétée à un rythme choisi. Commence par une seule,
          facile — la régularité bat l'ambition.
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => setEditing('new')}>Créer une habitude</button>
          </div>
        </EmptyState>
      ) : (
        <>
          {/* Graphique de la semaine */}
          <SectionHeader>7 derniers jours</SectionHeader>
          <div className="card">
            <BarChart data={week.map((d, i) => ({
              label: DAY_NAMES_SHORT[(new Date(d.date + 'T12:00:00Z').getUTCDay() + 6) % 7],
              value: d.rate,
              highlight: d.date === today
            }))} />
            <p style={{ color: 'var(--tertiary-label)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              Part des habitudes prévues faites chaque jour
            </p>
          </div>

          {/* Aujourd'hui */}
          <SectionHeader>Aujourd'hui</SectionHeader>
          <div className="list-group">
            {active.filter(r => isScheduled(r, today)).map(r => {
              const done = isDone(state.routineLogs, r.id, today)
              const streak = habitStreak(r, state.routineLogs, today)
              return (
                <div key={r.id} className="list-row">
                  <button className="check-btn" aria-label={`${done ? 'Décocher' : 'Cocher'} « ${r.name} »`} onClick={() => toggle(r)}>
                    <span className={`check-circle${done ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
                  </button>
                  <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setDetail(r)}>
                    <span className="row-title" style={done ? { color: 'var(--secondary-label)' } : undefined}>
                      {r.negative ? `Éviter : ${r.name}` : r.name}
                    </span>
                    <span className="row-sub">{streak > 0 ? `Série : ${streak} j` : 'Nouvelle série à lancer'}</span>
                  </button>
                  <Icon name="chevronRight" size={16} className="chevron" />
                </div>
              )
            })}
            {active.filter(r => isScheduled(r, today)).length === 0 && (
              <div className="list-row"><span className="row-main">
                <span className="row-sub">Rien de prévu aujourd'hui — repos assumé.</span>
              </span></div>
            )}
          </div>

          {/* Toutes les habitudes */}
          <SectionHeader>Régularité (30 jours)</SectionHeader>
          <div className="list-group">
            {active.map(r => {
              const c = completionRate(r, state.routineLogs, today)
              return (
                <button key={r.id} className="list-row" onClick={() => setDetail(r)}>
                  <ProgressRing value={c.rate} size={44} label={`de régularité pour ${r.name}`} />
                  <span className="row-main">
                    <span className="row-title">{r.negative ? `Éviter : ${r.name}` : r.name}</span>
                    <span className="row-sub">
                      {c.done}/{c.scheduled} jours prévus
                      {r.schedule === 'weekdays' ? ' · en semaine' : r.schedule === 'custom' ? ` · ${r.customDays.length} j/sem` : ' · quotidien'}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="chevron" />
                </button>
              )
            })}
          </div>
        </>
      )}

      {editing && <HabitEditor habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {detail && <HabitDetail habit={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null) }} />}
    </div>
  )
}

function HabitDetail({ habit, onClose, onEdit }: { habit: Routine; onClose: () => void; onEdit: () => void }) {
  const { state, updateUndoable } = useApp()
  const today = todayISO(state.profile.timezone)
  const states = dayStates(habit, state.routineLogs, today)
  const c = completionRate(habit, state.routineLogs, today)
  const streak = habitStreak(habit, state.routineLogs, today)

  return (
    <Sheet title={habit.negative ? `Éviter : ${habit.name}` : habit.name} onClose={onClose}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <ProgressRing value={c.rate} size={64} label="de régularité" />
        <div>
          <p style={{ fontSize: 15 }}><strong>{c.done}</strong> jours faits sur <strong>{c.scheduled}</strong> prévus (30 j)</p>
          <p style={{ fontSize: 14, color: 'var(--secondary-label)' }}>Série actuelle : {streak} jour{streak !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <SectionHeader>4 dernières semaines</SectionHeader>
      <div className="card">
        <DayGrid days={states} />
        <p style={{ color: 'var(--tertiary-label)', fontSize: 12, marginTop: 6 }}>
          Vert : fait · rouge : prévu mais manqué · gris : non prévu. Une case rouge
          n'efface pas les vertes — vise le taux, pas la perfection.
        </p>
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={onEdit}>Modifier</button>
      <button className="btn-plain btn-block" style={{ color: 'var(--danger)', minHeight: 44, marginTop: 4 }}
        onClick={() => {
          updateUndoable('Habitude archivée.', s => ({
            ...s, routines: s.routines.map(r => r.id === habit.id ? { ...r, archived: true } : r)
          }))
          onClose()
        }}>
        Archiver l'habitude
      </button>
    </Sheet>
  )
}

function HabitEditor({ habit, onClose }: { habit: Routine | null; onClose: () => void }) {
  const { update, toast } = useApp()
  const [name, setName] = useState(habit?.name ?? '')
  const [schedule, setSchedule] = useState<Routine['schedule']>(habit?.schedule ?? 'daily')
  const [customDays, setCustomDays] = useState<number[]>(habit?.customDays ?? [1, 3, 5])
  const [negative, setNegative] = useState(habit?.negative ?? false)

  const save = () => {
    if (!name.trim()) { toast('Un nom est nécessaire.'); return }
    if (schedule === 'custom' && customDays.length === 0) { toast('Choisis au moins un jour.'); return }
    const fields = { name: name.trim(), schedule, customDays: schedule === 'custom' ? [...customDays].sort() : [], negative }
    if (habit) {
      update(s => ({ ...s, routines: s.routines.map(r => r.id === habit.id ? { ...r, ...fields } : r) }))
    } else {
      update(s => ({ ...s, routines: [...s.routines, { id: newId('hab'), ...fields, archived: false, createdAt: nowISO() }] }))
      toast('Habitude créée. Première coche aujourd\'hui ?')
    }
    onClose()
  }

  return (
    <Sheet title={habit ? 'Habitude' : 'Nouvelle habitude'} onClose={onClose}>
      <label className="field-label" htmlFor="he-name">Nom</label>
      <input id="he-name" className="field" value={name} onChange={e => setName(e.target.value)} autoFocus
        placeholder="ex. 20 min d'Anki, lit avant minuit" />
      <label className="field-label">Rythme</label>
      <Segmented label="Rythme" value={schedule} onChange={setSchedule}
        options={[
          { value: 'daily', label: 'Tous les jours' },
          { value: 'weekdays', label: 'En semaine' },
          { value: 'custom', label: 'Certains jours' }
        ]} />
      {schedule === 'custom' && (
        <div className="chip-row" style={{ marginTop: 12 }} role="group" aria-label="Jours">
          {DAY_NAMES_FULL.map((d, i) => (
            <button key={d} type="button" className="chip" aria-pressed={customDays.includes(i + 1)}
              aria-label={d}
              onClick={() => setCustomDays(x => x.includes(i + 1) ? x.filter(y => y !== i + 1) : [...x, i + 1])}>
              {DAY_NAMES_SHORT[i]}
            </button>
          ))}
        </div>
      )}
      <button className="list-row" style={{ marginTop: 16, borderRadius: 12, background: 'var(--tertiary-system-background)' }}
        onClick={() => setNegative(!negative)} aria-pressed={negative}>
        <span className={`check-circle${negative ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
        <span className="row-main"><span className="row-title">Habitude à éviter</span>
          <span className="row-sub">Cocher = journée sans le comportement</span></span>
      </button>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}
