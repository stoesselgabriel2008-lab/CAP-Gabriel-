// Calendrier mensuel façon Google Agenda : grille du mois avec pastilles
// colorées par tâche, jour sélectionné → liste ordonnée dessous.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader, TaskEditor } from './Plan'
import { todayISO, addDays, isoWeekday, relativeLabel, nowISO } from '../lib/dates'
import { taskColor, categoryOf, categoryBarColor, priorityColor } from '../domain/categories'
import type { Task } from '../domain/types'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const pad = (n: number) => String(n).padStart(2, '0')

export function CalendarView() {
  const { state, updateUndoable } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [ym, setYm] = useState(() => today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const [y, m] = ym.split('-').map(Number)
  const daysCount = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const firstWd = isoWeekday(`${ym}-01`)

  const active = state.tasks.filter(t => !t.deletedAt && !t.done)

  // tâches par jour du mois affiché (date prévue, + échéances marquées)
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of active) {
      if (t.plannedDate?.startsWith(ym)) {
        map.set(t.plannedDate, [...(map.get(t.plannedDate) ?? []), t])
      }
      if (t.deadline?.startsWith(ym) && t.deadline !== t.plannedDate) {
        map.set(t.deadline, [...(map.get(t.deadline) ?? []), t])
      }
    }
    return map
  }, [active, ym])

  const shift = (months: number) => {
    const d = new Date(Date.UTC(y, m - 1 + months, 1))
    setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
  }

  const dayTasks = useMemo(() => {
    const planned = active.filter(t => t.plannedDate === selected)
      .sort((a, b) => (a.plannedTime ?? '99') .localeCompare(b.plannedTime ?? '99'))
    const deadlines = active.filter(t => t.deadline === selected && t.plannedDate !== selected)
    return { planned, deadlines }
  }, [active, selected])

  const complete = (t: Task) => {
    updateUndoable(`« ${t.title} » terminée.`, s => ({
      ...s, tasks: s.tasks.map(x => x.id === t.id ? { ...x, done: true, completedAt: nowISO() } : x)
    }))
  }

  const cells: Array<number | null> = [
    ...Array(firstWd - 1).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1)
  ]

  return (
    <div className="screen">
      <BackHeader title="Calendrier" onBack={() => ui.setSub('plan', null)}
        action="+ Tâche" onAction={() => setEditing('new')} />

      {/* Navigation du mois */}
      <div className="cal-head" style={{ marginTop: 4 }}>
        <button type="button" aria-label="Mois précédent" onClick={() => shift(-1)}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <span className="cal-title" style={{ fontSize: 18 }}>{MONTHS[m - 1]} {y}</span>
        <button type="button" aria-label="Mois suivant" onClick={() => shift(1)}>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      {/* Grille du mois */}
      <div className="card" style={{ padding: '10px 8px' }}>
        <div className="month-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
          {DOW.map((d, i) => <span key={`h${i}`} className="cal-dow">{d}</span>)}
          {cells.map((day, i) => {
            if (day === null) return <span key={`e${i}`} />
            const iso = `${ym}-${pad(day)}`
            const tasks = byDay.get(iso) ?? []
            const isToday = iso === today
            const isSel = iso === selected
            return (
              <button
                key={iso}
                className={`month-day${isSel ? ' selected' : ''}${isToday ? ' today' : ''}`}
                aria-label={`${day} ${MONTHS[m - 1]}${tasks.length ? `, ${tasks.length} tâche${tasks.length > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSel}
                onClick={() => setSelected(iso)}
              >
                <span className="month-day-num">{day}</span>
                <span className="month-day-dots" aria-hidden="true">
                  {tasks.slice(0, 3).map(t => (
                    <span key={t.id} style={{
                      background: taskColor(t.category, t.priority),
                      boxShadow: t.priority === 'haute' ? '0 0 0 1.5px var(--danger)' : undefined
                    }} />
                  ))}
                  {tasks.length > 3 && <span className="month-day-more">+{tasks.length - 3}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Jour sélectionné */}
      <SectionHeader action="+ Ce jour" onAction={() => setEditing('new')}>
        {relativeLabel(selected, today).charAt(0).toUpperCase() + relativeLabel(selected, today).slice(1)}
      </SectionHeader>
      {dayTasks.planned.length === 0 && dayTasks.deadlines.length === 0 ? (
        <div className="card">
          <EmptyState title="Rien ce jour-là">Temps libre — ou une tâche à y poser.</EmptyState>
        </div>
      ) : (
        <div className="list-group">
          {dayTasks.planned.map(t => (
            <div key={t.id} className="list-row">
              <button className="check-btn" aria-label={`Terminer « ${t.title} »`} onClick={() => complete(t)}>
                <span className="check-circle"><Icon name="check" size={14} /></span>
              </button>
              <span className="cat-bar" style={{ background: categoryBarColor(t.category) }} aria-hidden="true" />
              <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setEditing(t)}>
                <span className="row-title" style={{ display: 'block' }}>{t.title}</span>
                <span className="row-sub">
                  {t.plannedTime ? `${t.plannedTime} · ` : ''}
                  {categoryOf(t.category)?.label ?? ''}
                </span>
              </button>
              {t.priority !== 'normale' && (
                <span aria-label={t.priority === 'haute' ? 'Priorité haute' : 'Priorité basse'}
                  style={{ color: priorityColor(t.priority), display: 'flex', flexShrink: 0 }}>
                  <Icon name={t.priority === 'haute' ? 'flag' : 'down'} size={16} />
                </span>
              )}
              <Icon name="chevronRight" size={16} className="chevron" />
            </div>
          ))}
          {dayTasks.deadlines.map(t => (
            <button key={t.id} className="list-row" onClick={() => setEditing(t)}>
              <span style={{ color: 'var(--danger)', display: 'flex' }}><Icon name="flag" size={18} /></span>
              <span className="row-main">
                <span className="row-title">{t.title}</span>
                <span className="row-sub">Échéance ce jour</span>
              </span>
              <Icon name="chevronRight" size={16} className="chevron" />
            </button>
          ))}
        </div>
      )}

      {editing && (
        <TaskEditor
          task={editing === 'new' ? null : editing}
          defaults={editing === 'new' ? { plannedDate: selected } : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
