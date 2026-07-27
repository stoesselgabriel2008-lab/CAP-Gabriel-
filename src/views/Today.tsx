// Aujourd'hui : la meilleure prochaine action, Top 3, timeline courte,
// raccourcis. Une seule recommandation principale.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { SectionHeader, EmptyState, Sheet } from '../ui/Sheet'
import { TaskEditor } from './Plan'
import { SHORTCUT_DEFS, activeShortcuts, shortcutDef } from '../ui/shortcuts'
import { ProgressRing } from '../ui/charts'
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
  const [newTask, setNewTask] = useState(false)
  const [editShortcuts, setEditShortcuts] = useState(false)

  const focusMinToday = state.focusSessions
    .filter(s => s.endedAt && s.startedAt.slice(0, 10) === today)
    .reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
  const habitsDue = state.routines.filter(r => !r.archived && isScheduled(r, today))
  const habitsDone = habitsDue.filter(r => isDone(state.routineLogs, r.id, today)).length
  const streak = currentStreak(state.commitment, today)
  const focusGoal = state.settings.dailyFocusGoalMin

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label="Ajouter une tâche" onClick={() => setNewTask(true)}>
            <Icon name="plus" size={21} />
          </button>
          <button className="icon-btn" aria-label="Réglages" onClick={() => ui.navigate('me', 'settings')}>
            <Icon name="settings" size={21} />
          </button>
        </div>
      </div>
      <p className="subtitle-context">{greeting} {state.profile.firstName}</p>

      {/* Carte Maintenant */}
      <section aria-label="Maintenant">
        <div className={`now-card${rec.action.kind === 'sos' ? ' sos-suggested' : ''}`}>
          <div className="now-head">
            <span className="now-kicker">Maintenant</span>
            <button className="now-why-toggle" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
              Pourquoi ?
            </button>
          </div>
          <div className="now-title">{rec.title}</div>
          <div className="now-sub">{rec.subtitle}</div>
          <button
            className={`btn btn-block ${rec.action.kind === 'sos' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => runAction(rec)}
          >
            {rec.cta}
          </button>
          {showWhy && <p className="now-why">{rec.why}</p>}
        </div>
      </section>

      {/* L'anneau du jour — un seul élément dessiné, le reste s'efface */}
      <DayRing
        due={due.length}
        reviewsDone={state.reviewLogs.filter(l => l.date === today).length}
        focusMin={focusMinToday}
        focusGoal={focusGoal}
        habitsDone={habitsDone}
        habitsDue={habitsDue.length}
        streak={streak}
        top3Done={state.tasks.filter(t => !t.deletedAt && t.top3Date === today && t.done).length}
        top3Total={state.tasks.filter(t => !t.deletedAt && t.top3Date === today).length}
      />

      {/* Raccourcis — visibles sans défiler, personnalisables via « Modifier » */}
      <SectionHeader action="Modifier" onAction={() => setEditShortcuts(true)}>Raccourcis</SectionHeader>
      <ShortcutGrid onNewTask={() => setNewTask(true)} />

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

      {/* Check-in du jour */}
      {checkIn && (
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          Check-in : énergie {checkIn.energy} · stress {checkIn.stress} · sommeil {checkIn.sleepFelt}
          {checkIn.urge > 0 ? ` · envie ${checkIn.urge}/10` : ''}
        </p>
      )}

      {pickerOpen && <Top3Picker onClose={() => setPickerOpen(false)} />}
      {newTask && <TaskEditor task={null} defaults={{ plannedDate: today }} onClose={() => setNewTask(false)} />}
      {editShortcuts && <ShortcutsEditor onClose={() => setEditShortcuts(false)} />}
    </div>
  )
}

/** Grille des raccourcis actifs (réglage settings.shortcuts, ordonné). */
function ShortcutGrid({ onNewTask }: { onNewTask: () => void }) {
  const { state } = useApp()
  const ui = useUi()
  const ids = activeShortcuts(state.settings.shortcuts)

  const run = (id: string) => {
    switch (id) {
      case 'task': onNewTask(); break
      case 'capture': ui.openCapture(); break
      case 'checkin': ui.openCheckIn(); break
      case 'sos': ui.openSOS(); break
      case 'focus': ui.openTimerStart(); break
      case 'review': ui.navigate('review', null); break
      case 'calendar': ui.navigate('plan', 'calendar'); break
      case 'habits': ui.navigate('plan', 'habits'); break
      case 'notes': ui.navigate('plan', 'notes'); break
      case 'search': ui.openCommand(); break
      case 'evening': ui.openEvening(); break
    }
  }

  return (
    <div className="shortcut-grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, ids.length))}, 1fr)` }}>
      {ids.map(id => {
        const d = shortcutDef(id)
        if (!d) return null
        return (
          <button key={id} className={`shortcut${d.danger ? ' sos' : ''}`} aria-label={d.aria} onClick={() => run(id)}>
            <span className="shortcut-circle"><Icon name={d.icon} size={26} /></span> {d.label}
          </button>
        )
      })}
    </div>
  )
}

/** Choix des raccourcis affichés : cocher pour ajouter (dans l'ordre), max 8. */
function ShortcutsEditor({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const current = activeShortcuts(state.settings.shortcuts)

  const toggle = (id: string) => {
    const isIn = current.includes(id)
    if (isIn && current.length <= 1) { toast('Garde au moins un raccourci.'); return }
    if (!isIn && current.length >= 8) { toast('8 raccourcis maximum.'); return }
    const next = isIn ? current.filter(x => x !== id) : [...current, id]
    update(s => ({ ...s, settings: { ...s.settings, shortcuts: next } }))
  }

  return (
    <Sheet title="Raccourcis de l'accueil" onClose={onClose} closeLabel="OK">
      <p style={{ color: 'var(--secondary-label)', fontSize: 14, margin: '0 0 12px', lineHeight: 1.5 }}>
        Coche les actions à garder sous la main — elles s'affichent dans l'ordre où tu les choisis.
      </p>
      <div className="list-group">
        {SHORTCUT_DEFS.map(d => {
          const isIn = current.includes(d.id)
          const pos = current.indexOf(d.id)
          return (
            <button key={d.id} className="list-row" aria-pressed={isIn} onClick={() => toggle(d.id)}>
              <span className={`check-circle${isIn ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
              <span style={{ color: d.danger ? 'var(--danger)' : 'var(--tint)', display: 'flex', flexShrink: 0 }}>
                <Icon name={d.icon} size={20} />
              </span>
              <span className="row-main"><span className="row-title">{d.label}</span></span>
              {isIn && <span className="row-detail">{pos + 1}</span>}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Anneau du jour : Top 3, révisions, habitudes (et focus si objectif) en un cercle. */
function DayRing({ due, reviewsDone, focusMin, focusGoal, habitsDone, habitsDue, streak, top3Done, top3Total }: {
  due: number
  reviewsDone: number
  focusMin: number
  focusGoal: number
  habitsDone: number
  habitsDue: number
  streak: number
  top3Done: number
  top3Total: number
}) {
  const ui = useUi()
  const parts: number[] = []
  if (top3Total > 0) parts.push(top3Done / top3Total)
  if (due + reviewsDone > 0) parts.push(reviewsDone / (due + reviewsDone))
  if (habitsDue > 0) parts.push(habitsDone / habitsDue)
  if (focusGoal > 0) parts.push(Math.min(1, focusMin / focusGoal))
  const value = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0

  const row = (label: string, detail: string, onClick: () => void) => (
    <button className="dayring-row" onClick={onClick}>
      <span className="dayring-label">{label}</span>
      <span className="dayring-detail">{detail}</span>
      <Icon name="chevronRight" size={14} className="chevron" />
    </button>
  )

  return (
    <div className="card dayring" aria-label="Progression du jour">
      <div className="dayring-ring">
        <ProgressRing value={value} size={72} label="de la journée" />
      </div>
      <div className="dayring-rows">
        {row('Révisions', due > 0 ? `${due} due${due > 1 ? 's' : ''}` : reviewsDone > 0 ? 'à jour' : '—', () => ui.navigate('review', null))}
        {row('Focus', focusGoal > 0 ? `${focusMin}/${focusGoal} min` : focusMin > 0 ? `${focusMin} min` : '—', () => ui.openTimerStart())}
        {row('Habitudes', habitsDue > 0 ? `${habitsDone}/${habitsDue}` : '—', () => ui.navigate('plan', 'habits'))}
        {row('Engagement', `${streak} j`, () => ui.navigate('coach', 'control'))}
      </div>
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
