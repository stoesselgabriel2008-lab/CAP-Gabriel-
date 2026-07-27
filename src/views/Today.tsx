// Aujourd'hui : la meilleure prochaine action, Top 3, timeline courte,
// raccourcis. Une seule recommandation principale.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { SectionHeader, EmptyState, Sheet } from '../ui/Sheet'
import { recommend, todayCheckIn, computeDueQueue, shouldReduceAmbition, type Recommendation } from '../domain/recommend'
import { todayISO, formatCivilLong, localHour, ageAt, addDays } from '../lib/dates'
import { newId } from '../lib/id'
import { nowISO } from '../lib/dates'
import type { Task } from '../domain/types'
import { isScheduled, isDone } from '../domain/habits'
import { currentStreak } from '../domain/streak'

export function Today() {
  const { state, update, updateUndoable } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const hour = localHour(state.profile.timezone)
  const rec = useMemo(() => recommend(state), [state])
  const due = useMemo(() => computeDueQueue(state, today), [state, today])
  const checkIn = todayCheckIn(state, today)
  const [completing, setCompleting] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  const focusMinToday = state.focusSessions
    .filter(s => s.endedAt && s.startedAt.slice(0, 10) === today)
    .reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
  const habitsDue = state.routines.filter(r => !r.archived && isScheduled(r, today))
  const habitsDone = habitsDue.filter(r => isDone(state.routineLogs, r.id, today)).length
  const streak = currentStreak(state.commitment, today)

  const top3 = state.tasks
    .filter(t => !t.deletedAt && t.top3Date === today && !t.done)
    .sort((a, b) => (a.top3Rank ?? 9) - (b.top3Rank ?? 9))

  const timelineTasks = state.tasks
    .filter(t => !t.done && !t.deletedAt && t.plannedDate === today && t.plannedTime)
    .sort((a, b) => (a.plannedTime ?? '').localeCompare(b.plannedTime ?? ''))

  const greeting = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const runAction = (r: Recommendation) => {
    switch (r.action.kind) {
      case 'sos': ui.openSOS(); break
      case 'checkin': ui.openCheckIn(); break
      case 'focus': ui.openTimerStart({ minutes: r.action.minutes, unitId: r.action.unitId, label: r.action.label }); break
      case 'review-due': ui.navigate('review', null); break
      case 'inbox': ui.navigate('plan', 'inbox'); break
      case 'evening': ui.openEvening(); break
      case 'error-journal': ui.navigate('review', 'errors'); break
      case 'plan-tomorrow': ui.navigate('plan', null); break
      case 'open-timer': ui.openTimerScreen(); break
      case 'weekly-review': ui.navigate('me', 'weekly'); break
    }
  }

  const completeTask = (task: Task) => {
    setCompleting(task.id)
    setTimeout(() => {
      setCompleting(null)
      updateUndoable(`« ${task.title} » terminée.`, s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === task.id ? { ...t, done: true, completedAt: nowISO() } : t)
      }))
    }, 220)
  }

  const moveRank = (task: Task, dir: -1 | 1) => {
    const ordered = [...top3]
    const idx = ordered.findIndex(t => t.id === task.id)
    const swap = ordered[idx + dir]
    if (!swap) return
    update(s => ({
      ...s,
      tasks: s.tasks.map(t => {
        if (t.id === task.id) return { ...t, top3Rank: swap.top3Rank }
        if (t.id === swap.id) return { ...t, top3Rank: task.top3Rank }
        return t
      })
    }))
  }

  return (
    <div className="screen">
      <div className="root-header">
        <div>
          <p className="date-kicker">{formatCivilLong(today)}</p>
          <h1 className="large-title">Aujourd'hui</h1>
        </div>
        <button className="icon-btn" aria-label="Réglages" onClick={() => ui.navigate('me', 'settings')}>
          <Icon name="settings" size={21} />
        </button>
      </div>
      <p className="subtitle-context">{greeting} {state.profile.firstName}</p>

      {/* Carte Maintenant */}
      <section aria-label="Maintenant">
        <div className={`now-card${rec.action.kind === 'sos' ? ' sos-suggested' : ''}`}>
          <div className="now-kicker">Maintenant</div>
          <div className="now-title">{rec.title}</div>
          <div className="now-sub">{rec.subtitle}</div>
          <button
            className={`btn btn-block btn-large ${rec.action.kind === 'sos' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => runAction(rec)}
          >
            {rec.cta}
          </button>
          <button className="now-why-toggle" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
            Pourquoi cette proposition ?
          </button>
          {showWhy && <p className="now-why">{rec.why}</p>}
        </div>
      </section>

      {/* Tuiles d'un coup d'œil (façon Apple Fitness) */}
      <div className="tile-grid">
        <button className="card tile" onClick={() => ui.navigate('review', null)}>
          <span className="tile-label"><Icon name="review" size={16} /> Révisions</span>
          <span className="tile-value">{due.length}</span>
          <span className="tile-sub">{due.length > 0 ? `due${due.length > 1 ? 's' : ''} aujourd'hui` : 'rien de dû'}</span>
        </button>
        <button className="card tile" onClick={() => ui.openTimerStart()}>
          <span className="tile-label"><Icon name="timer" size={16} /> Focus</span>
          <span className="tile-value">{focusMinToday > 0 ? `${focusMinToday} min` : '—'}</span>
          <span className="tile-sub">{focusMinToday > 0 ? "aujourd'hui" : 'lancer une session'}</span>
        </button>
        <button className="card tile" onClick={() => ui.navigate('plan', 'habits')}>
          <span className="tile-label"><Icon name="check" size={16} /> Habitudes</span>
          <span className="tile-value">{habitsDue.length > 0 ? `${habitsDone}/${habitsDue.length}` : '—'}</span>
          <span className="tile-sub">{habitsDue.length > 0 ? 'faites ce jour' : 'en créer une'}</span>
        </button>
        <button className="card tile" onClick={() => ui.navigate('coach', 'control')}>
          <span className="tile-label"><Icon name="sos" size={16} /> Engagement</span>
          <span className="tile-value">{streak} j</span>
          <span className="tile-sub">série en cours</span>
        </button>
      </div>

      {/* Bien démarrer : checklist de premiers pas, disparaît une fois complétée */}
      <StarterCard onPickTop3={() => setPickerOpen(true)} />

      {/* Top 3 */}
      <SectionHeader action="Choisir" onAction={() => setPickerOpen(true)}>Top 3</SectionHeader>
      {shouldReduceAmbition(state, today) && top3.length > 1 && (
        <p style={{ color: 'var(--secondary-label)', fontSize: 14, margin: '0 4px 8px' }}>
          Sommeil ressenti mauvais : une seule vraie priorité suffit aujourd'hui.
        </p>
      )}
      {top3.length === 0 ? (
        <div className="list-group">
          <button className="list-row" onClick={() => setPickerOpen(true)}>
            <span className="check-circle" style={{ borderStyle: 'dashed' }}><Icon name="plus" size={14} /></span>
            <span className="row-main">
              <span className="row-title" style={{ color: 'var(--tint)' }}>Choisir mes 3 priorités</span>
              <span className="row-sub">Les tâches qui feraient de cette journée une réussite</span>
            </span>
            <Icon name="chevronRight" size={16} className="chevron" />
          </button>
        </div>
      ) : (
        <div className="list-group">
          {top3.map((t, i) => (
            <div key={t.id} className={`list-row top3-row${completing === t.id ? ' completing' : ''}`}>
              <button className="check-btn" aria-label={`Terminer « ${t.title} »`} onClick={() => completeTask(t)}>
                <span className="check-circle"><Icon name="check" size={14} /></span>
              </button>
              <span className="row-main">
                <span className="row-title">{t.title}</span>
                {t.subjectId && <span className="row-sub">{state.subjects.find(s => s.id === t.subjectId)?.name}</span>}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <button aria-label="Monter" disabled={i === 0} onClick={() => moveRank(t, -1)}
                  style={{ minHeight: 22, minWidth: 44, color: i === 0 ? 'var(--tertiary-label)' : 'var(--secondary-label)' }}>
                  <Icon name="up" size={16} />
                </button>
                <button aria-label="Descendre" disabled={i === top3.length - 1} onClick={() => moveRank(t, 1)}
                  style={{ minHeight: 22, minWidth: 44, color: i === top3.length - 1 ? 'var(--tertiary-label)' : 'var(--secondary-label)' }}>
                  <Icon name="down" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Révisions dues */}
      {due.length > 0 && (
        <>
          <SectionHeader action="Tout voir" onAction={() => ui.navigate('review', null)}>Révisions</SectionHeader>
          <button className="list-group list-row" style={{ display: 'flex' }} onClick={() => ui.navigate('review', null)}>
            <span style={{ color: 'var(--tint)', display: 'flex' }}><Icon name="review" size={22} /></span>
            <span className="row-main">
              <span className="row-title">{due.length} révision{due.length > 1 ? 's' : ''} due{due.length > 1 ? 's' : ''}</span>
              <span className="row-sub">{due[0].why}</span>
            </span>
            <Icon name="chevronRight" size={16} className="chevron" />
          </button>
        </>
      )}

      {/* Habitudes du jour */}
      <TodayHabits />

      {/* Timeline — seulement si des blocs horaires existent */}
      {timelineTasks.length > 0 && (
      <>
      <SectionHeader>Ta journée</SectionHeader>
      <div className="card timeline" aria-label="Timeline du jour">
        {timelineTasks.map(t => {
          const passed = (t.plannedTime ?? '') < `${String(hour).padStart(2, '0')}:00`
          return (
            <div key={t.id} className="timeline-row" style={{ opacity: passed ? 0.5 : 1 }}>
              <span className="timeline-time">{t.plannedTime}</span>
              <span className="row-title">{t.title}</span>
            </div>
          )
        })}
        <div className="timeline-now" aria-label="Maintenant">
          {String(hour).padStart(2, '0')}:{String(new Date().getMinutes()).padStart(2, '0')}
        </div>
      </div>
      </>
      )}

      {/* Raccourcis */}
      <SectionHeader>Raccourcis</SectionHeader>
      <div className="shortcut-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button className="shortcut" onClick={ui.openCapture}>
          <span className="shortcut-circle"><Icon name="capture" size={26} /></span> Capturer
        </button>
        <button className="shortcut sos" onClick={ui.openSOS}>
          <span className="shortcut-circle"><Icon name="sos" size={26} /></span> SOS
        </button>
        <button className="shortcut" onClick={ui.openCheckIn}>
          <span className="shortcut-circle"><Icon name="bolt" size={26} /></span> Check-in
        </button>
      </div>

      {/* Cette semaine */}
      <WeekStats />

      {/* Check-in du jour */}
      {checkIn && (
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          Check-in : énergie {checkIn.energy} · stress {checkIn.stress} · sommeil {checkIn.sleepFelt}
          {checkIn.urge > 0 ? ` · envie ${checkIn.urge}/10` : ''}
        </p>
      )}

      {pickerOpen && <Top3Picker onClose={() => setPickerOpen(false)} />}
    </div>
  )
}

/** Habitudes prévues aujourd'hui : coche rapide, détail dans Plan → Habitudes. */
function TodayHabits() {
  const { state, update } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const due = state.routines.filter(r => !r.archived && isScheduled(r, today))
  if (due.length === 0) return null
  const doneCount = due.filter(r => isDone(state.routineLogs, r.id, today)).length

  const toggle = (id: string) => {
    update(s => {
      const existing = s.routineLogs.find(l => l.routineId === id && l.date === today)
      return {
        ...s,
        routineLogs: existing
          ? s.routineLogs.map(l => l.id === existing.id ? { ...l, done: !l.done } : l)
          : [...s.routineLogs, { id: newId('rl'), routineId: id, date: today, done: true }]
      }
    })
  }

  return (
    <>
      <SectionHeader action="Détails" onAction={() => ui.navigate('plan', 'habits')}>
        Habitudes · {doneCount}/{due.length}
      </SectionHeader>
      <div className="list-group">
        {due.map(r => {
          const done = isDone(state.routineLogs, r.id, today)
          return (
            <button key={r.id} className="list-row" onClick={() => toggle(r.id)}
              aria-pressed={done} aria-label={`${done ? 'Décocher' : 'Cocher'} « ${r.name} »`}>
              <span className={`check-circle${done ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
              <span className="row-main">
                <span className="row-title" style={done ? { color: 'var(--secondary-label)' } : undefined}>
                  {r.negative ? `Éviter : ${r.name}` : r.name}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/** Checklist de démarrage : guide les premiers pas, se masque toute seule. */
function StarterCard({ onPickTop3 }: { onPickTop3: () => void }) {
  const { state, update } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  if (state.settings.hintsDismissed.includes('starter')) return null

  const items = [
    { id: 'checkin', label: 'Faire ton premier check-in', done: state.checkIns.length > 0, run: () => ui.openCheckIn() },
    { id: 'subject', label: 'Créer ta première matière', done: state.subjects.length > 0, run: () => ui.navigate('review', null) },
    { id: 'unit', label: 'Ajouter un chapitre (plan de révision auto)', done: state.reviewPlans.length > 0, run: () => ui.navigate('review', null) },
    { id: 'top3', label: 'Choisir ton Top 3 du jour', done: state.tasks.some(t => t.top3Date !== null), run: onPickTop3 },
    { id: 'focus', label: 'Lancer ta première session de focus', done: state.focusSessions.length > 0, run: () => ui.openTimerStart() }
  ]
  const remaining = items.filter(i => !i.done)
  if (remaining.length === 0) return null

  return (
    <>
      <SectionHeader action="Masquer" onAction={() =>
        update(s => ({ ...s, settings: { ...s.settings, hintsDismissed: [...s.settings.hintsDismissed, 'starter'] } }))
      }>
        Bien démarrer · {items.length - remaining.length}/{items.length}
      </SectionHeader>
      <div className="list-group">
        {items.map(i => (
          <button key={i.id} className="list-row" onClick={() => { if (!i.done) i.run() }} disabled={i.done}>
            <span className={`check-circle${i.done ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
            <span className="row-main">
              <span className="row-title" style={i.done ? { color: 'var(--secondary-label)', textDecoration: 'line-through' } : undefined}>
                {i.label}
              </span>
            </span>
            {!i.done && <Icon name="chevronRight" size={16} className="chevron" />}
          </button>
        ))}
      </div>
    </>
  )
}

/** Trois chiffres réels de la semaine — pas un mur de graphiques. */
function WeekStats() {
  const { state } = useApp()
  const today = todayISO(state.profile.timezone)
  const weekAgo = addDays(today, -7)
  const sessions = state.focusSessions.filter(s => s.endedAt && s.startedAt.slice(0, 10) >= weekAgo)
  const minutes = sessions.reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
  const reviews = state.reviewLogs.filter(l => l.date >= weekAgo).length
  if (sessions.length === 0 && reviews === 0) return null

  const stat = (value: string | number, label: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <>
      <SectionHeader>Cette semaine</SectionHeader>
      <div className="card" style={{ display: 'flex', gap: 8, padding: '18px 8px' }}>
        {stat(sessions.length, `session${sessions.length !== 1 ? 's' : ''} focus`)}
        {stat(minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : minutes, minutes >= 60 ? 'de focus' : 'min de focus')}
        {stat(reviews, `révision${reviews !== 1 ? 's' : ''} notée${reviews !== 1 ? 's' : ''}`)}
      </div>
    </>
  )
}

function Top3Picker({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const candidates = state.tasks
    .filter(t => !t.done && !t.deletedAt && !t.someday)
    .sort((a, b) => {
      const aScore = (a.plannedDate === today ? -2 : 0) + (a.priority === 'haute' ? -1 : 0)
      const bScore = (b.plannedDate === today ? -2 : 0) + (b.priority === 'haute' ? -1 : 0)
      return aScore - bScore
    })
  const selected = candidates.filter(t => t.top3Date === today)
  const [newTitle, setNewTitle] = useState('')

  const toggle = (taskId: string) => {
    update(s => {
      const cur = s.tasks.filter(t => t.top3Date === today && !t.done && !t.deletedAt)
      const isIn = cur.some(t => t.id === taskId)
      if (!isIn && cur.length >= 3) {
        return s // limite : 3
      }
      const nextRank = cur.length + 1
      return {
        ...s,
        tasks: s.tasks.map(t => t.id === taskId
          ? isIn
            ? { ...t, top3Date: null, top3Rank: null }
            : { ...t, top3Date: today, top3Rank: nextRank, plannedDate: t.plannedDate ?? today }
          : t)
      }
    })
  }

  const addNew = () => {
    const title = newTitle.trim()
    if (!title) return
    if (selected.length >= 3) { toast('Le Top 3 est plein — retire une tâche d\'abord.'); return }
    update(s => {
      const count = s.tasks.filter(t => t.top3Date === today && !t.done && !t.deletedAt).length
      return {
        ...s,
        tasks: [...s.tasks, {
          id: newId('task'), title, note: '', plannedDate: today, deadline: null,
          plannedTime: null, durationMin: null, energy: null, priority: 'haute' as const,
          projectId: null, subjectId: null, someday: false,
          top3Rank: count + 1, top3Date: today, done: false,
          createdAt: nowISO(), completedAt: null, deletedAt: null
        }]
      }
    })
    setNewTitle('')
  }

  return (
    <Sheet title={`Top 3 (${selected.length}/3)`} onClose={onClose} closeLabel="OK">
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="field" value={newTitle} onChange={e => setNewTitle(e.target.value)}
          placeholder="Nouvelle tâche prioritaire" aria-label="Nouvelle tâche prioritaire"
          onKeyDown={e => { if (e.key === 'Enter') addNew() }} />
        <button className="btn btn-primary" onClick={addNew} disabled={!newTitle.trim()}>Ajouter</button>
      </div>
      {candidates.length === 0 && (
        <EmptyState title="Aucune tâche disponible">
          Capture d'abord une tâche avec le bouton +.
        </EmptyState>
      )}
      <div className="list-group" style={{ marginTop: 16 }}>
        {candidates.slice(0, 30).map(t => {
          const isIn = t.top3Date === today
          return (
            <button key={t.id} className="list-row" aria-pressed={isIn} onClick={() => toggle(t.id)}>
              <span className={`check-circle${isIn ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
              <span className="row-main">
                <span className="row-title">{t.title}</span>
                {t.deadline && <span className="row-sub">échéance {t.deadline}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
