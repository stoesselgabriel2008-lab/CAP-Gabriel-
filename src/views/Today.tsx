// Aujourd'hui : la meilleure prochaine action, Top 3, timeline courte,
// raccourcis. Une seule recommandation principale.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { SectionHeader, EmptyState, Sheet } from '../ui/Sheet'
import { recommend, todayCheckIn, computeDueQueue, shouldReduceAmbition, type Recommendation } from '../domain/recommend'
import { todayISO, formatCivilLong, localHour, ageAt } from '../lib/dates'
import { newId } from '../lib/id'
import { nowISO } from '../lib/dates'
import type { Task } from '../domain/types'

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
      <h1 className="large-title">Aujourd'hui</h1>
      <p className="subtitle-context">
        {greeting} {state.profile.firstName} · {formatCivilLong(today)}
      </p>

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
          <p className="now-why">Pourquoi : {rec.why}</p>
        </div>
      </section>

      {/* Top 3 */}
      <SectionHeader action="Choisir" onAction={() => setPickerOpen(true)}>Top 3</SectionHeader>
      {shouldReduceAmbition(state, today) && top3.length > 1 && (
        <p style={{ color: 'var(--secondary-label)', fontSize: 14, margin: '0 4px 8px' }}>
          Sommeil ressenti mauvais : une seule vraie priorité suffit aujourd'hui.
        </p>
      )}
      {top3.length === 0 ? (
        <div className="card">
          <EmptyState title="Pas encore de priorités">
            Choisis jusqu'à trois tâches qui feraient de cette journée une réussite.
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setPickerOpen(true)}>Choisir le Top 3</button>
            </div>
          </EmptyState>
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

      {/* Timeline */}
      <SectionHeader>Ta journée</SectionHeader>
      <div className="card timeline" aria-label="Timeline du jour">
        {timelineTasks.length === 0 && (
          <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>
            Aucun bloc horaire prévu. Le temps non planifié est du temps disponible — pas du retard.
          </p>
        )}
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

      {/* Raccourcis */}
      <SectionHeader>Raccourcis</SectionHeader>
      <div className="shortcut-grid">
        <button className="shortcut" onClick={() => ui.openTimerStart()}>
          <Icon name="timer" size={26} /> Focus
        </button>
        <button className="shortcut" onClick={ui.openCapture}>
          <Icon name="capture" size={26} /> Capturer
        </button>
        <button className="shortcut sos" onClick={ui.openSOS}>
          <Icon name="sos" size={26} /> SOS
        </button>
        <button className="shortcut" onClick={ui.openCheckIn}>
          <Icon name="bolt" size={26} /> Check-in
        </button>
      </div>

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
