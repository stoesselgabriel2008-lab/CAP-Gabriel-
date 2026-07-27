// Plan : Inbox, tâches (Aujourd'hui / À venir / Un jour / échéances),
// projets, objectifs, revue hebdomadaire.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon, IconChip } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState, ChoiceChips } from '../ui/Sheet'
import { DateField, TimeField } from '../ui/pickers'
import { HabitsView } from './Habits'
import { NotesView } from './Notes'
import { CalendarView } from './CalendarView'
import { TASK_CATEGORIES, taskColor, categoryOf, categoryBarColor, priorityColor } from '../domain/categories'
import { completeTask } from '../domain/repeat'
import { todayISO, addDays, relativeLabel, nowISO, daysBetween } from '../lib/dates'
import { newId } from '../lib/id'
import type { Task, Capture, Project, Goal } from '../domain/types'

export function Plan() {
  const { state } = useApp()
  const ui = useUi()
  const sub = ui.sub.plan ?? null
  const inboxCount = state.captures.filter(c => !c.processedAt).length

  if (sub === 'inbox') return <InboxView />
  if (sub === 'projects') return <ProjectsView />
  if (sub === 'goals') return <GoalsView />
  if (sub === 'habits') return <HabitsView />
  if (sub === 'notes') return <NotesView />
  if (sub === 'calendar') return <CalendarView />

  return <PlanHome inboxCount={inboxCount} />
}

function PlanHome({ inboxCount }: { inboxCount: number }) {
  const { state, update, updateUndoable, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [section, setSection] = useState<'today' | 'upcoming' | 'someday' | 'done'>('today')

  const active = state.tasks.filter(t => !t.deletedAt)
  const lists = useMemo(() => ({
    overdue: active.filter(t => !t.done && !t.someday && t.plannedDate && t.plannedDate < today),
    today: active.filter(t => !t.done && (t.plannedDate === today || (t.deadline && daysBetween(today, t.deadline) <= 0))),
    upcoming: active.filter(t => !t.done && !t.someday && ((t.plannedDate && t.plannedDate > today) || (!t.plannedDate && t.deadline && t.deadline > today) || (!t.plannedDate && !t.deadline))),
    someday: active.filter(t => !t.done && t.someday),
    done: active.filter(t => t.done).slice(-30).reverse()
  }), [active, today])

  const reschedule = (t: Task, date: string, label: string) => {
    update(s => ({ ...s, tasks: s.tasks.map(x => x.id === t.id ? { ...x, plannedDate: date } : x) }))
    toast(label)
  }

  const taskRow = (t: Task) => (
    <div key={t.id} className="list-row">
      {!t.done ? (
        <button className="check-btn" aria-label={`Terminer « ${t.title} »`} onClick={() => complete(t)}>
          <span className="check-circle"><Icon name="check" size={14} /></span>
        </button>
      ) : (
        <span className="check-circle checked" style={{ marginRight: 0 }}><Icon name="check" size={14} /></span>
      )}
      <span className="cat-bar" style={{ background: categoryBarColor(t.category) }} aria-hidden="true" />
      <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setEditing(t)}>
        <span className="row-title" style={{ display: 'block', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--secondary-label)' : undefined }}>{t.title}</span>
        <span className="row-sub">
          {categoryOf(t.category) && `${categoryOf(t.category)!.label} · `}
          {t.plannedDate && `prévu ${relativeLabel(t.plannedDate, today)}`}
          {t.deadline && `${t.plannedDate ? ' · ' : ''}échéance ${relativeLabel(t.deadline, today)}`}
          {t.projectId && ` · ${state.projects.find(p => p.id === t.projectId)?.name ?? ''}`}
        </span>
      </button>
      {t.priority !== 'normale' && !t.done && (
        <span aria-label={t.priority === 'haute' ? 'Priorité haute' : 'Priorité basse'}
          style={{ color: priorityColor(t.priority), display: 'flex', flexShrink: 0 }}>
          <Icon name={t.priority === 'haute' ? 'flag' : 'down'} size={16} />
        </span>
      )}
      <Icon name="chevronRight" size={16} className="chevron" />
    </div>
  )

  const complete = (t: Task) => {
    updateUndoable(`« ${t.title} » terminée.${t.repeat ? ' Prochaine occurrence créée.' : ''}`,
      s => completeTask(s, t.id, today))
  }

  return (
    <div className="screen">
      <div className="root-header">
        <h1 className="large-title">Plan</h1>
        <button className="btn-add-pill" aria-label="Nouvelle tâche" onClick={() => setEditing('new')}>
          <Icon name="plus" size={17} /> Tâche
        </button>
      </div>
      <div className="list-group" style={{ marginTop: 8 }}>
        <button className="list-row" onClick={() => ui.setSub('plan', 'calendar')}>
          <IconChip name="plan" color="#ff453a" />
          <span className="row-main">
            <span className="row-title">Calendrier</span>
            <span className="row-sub">Le mois en un coup d'œil, couleurs par catégorie</span>
          </span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('plan', 'inbox')}>
          <IconChip name="inbox" color="#0a84ff" />
          <span className="row-main"><span className="row-title">Inbox</span></span>
          {inboxCount > 0 && <span className="badge-count">{inboxCount}</span>}
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('plan', 'habits')}>
          <IconChip name="check" color="#30d158" />
          <span className="row-main">
            <span className="row-title">Habitudes</span>
            <span className="row-sub">Suivi quotidien, séries et graphiques</span>
          </span>
          <span className="row-detail">{state.routines.filter(r => !r.archived).length || ''}</span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('plan', 'notes')}>
          <IconChip name="book" color="#ff9f0a" />
          <span className="row-main">
            <span className="row-title">Notes</span>
            <span className="row-sub">Fiches et idées durables</span>
          </span>
          <span className="row-detail">{state.notes.filter(n => !n.deletedAt).length || ''}</span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('plan', 'projects')}>
          <IconChip name="flag" color="#bf5af2" />
          <span className="row-main"><span className="row-title">Projets</span></span>
          <span className="row-detail">{state.projects.filter(p => p.status === 'actif').length}</span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('plan', 'goals')}>
          <IconChip name="bolt" color="#64d2ff" />
          <span className="row-main"><span className="row-title">Objectifs</span></span>
          <span className="row-detail">{state.goals.filter(g => !g.done).length}</span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>

      <SectionHeader>Tâches</SectionHeader>
      <Segmented label="Filtre des tâches" value={section} onChange={setSection}
        options={[
          { value: 'today', label: 'Auj.' },
          { value: 'upcoming', label: 'À venir' },
          { value: 'someday', label: 'Un jour' },
          { value: 'done', label: 'Faites' }
        ]} />

      {section === 'today' && lists.overdue.length > 0 && (
        <>
          <h3 className="section-header" style={{ color: 'var(--warning)' }}>
            En retard · {lists.overdue.length}
          </h3>
          <div className="list-group">
            {lists.overdue.map(t => (
              <div key={t.id} className="list-row">
                <button className="check-btn" aria-label={`Terminer « ${t.title} »`} onClick={() => complete(t)}>
                  <span className="check-circle"><Icon name="check" size={14} /></span>
                </button>
                <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setEditing(t)}>
                  <span className="row-title" style={{ display: 'block' }}>{t.title}</span>
                  <span className="row-sub">prévu {relativeLabel(t.plannedDate!, today)}</span>
                </button>
                <button className="btn-plain" style={{ minHeight: 44, fontSize: 14, flexShrink: 0 }}
                  onClick={() => reschedule(t, today, `« ${t.title} » replanifiée aujourd'hui.`)}>
                  Auj.
                </button>
                <button className="btn-plain" style={{ minHeight: 44, fontSize: 14, flexShrink: 0 }}
                  onClick={() => reschedule(t, addDays(today, 1), `« ${t.title} » reportée à demain.`)}>
                  Demain
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 12 }}>
        {section === 'upcoming' && lists.upcoming.length > 0 ? (
          <UpcomingAgenda tasks={lists.upcoming} today={today} onEdit={setEditing} onComplete={complete} />
        ) : lists[section].length === 0 ? (
          <div className="card">
            <EmptyState title={section === 'done' ? 'Rien de terminé récemment' : 'Rien ici'}>
              {section === 'today' && "Aucune tâche prévue aujourd'hui. Tu peux en planifier une ou profiter de l'espace."}
              {section === 'upcoming' && 'Capture une tâche avec le bouton + pour la retrouver ici.'}
              {section === 'someday' && '« Un jour » garde les idées sans encombrer ta semaine.'}
            </EmptyState>
          </div>
        ) : (
          section === 'today' ? (
            <>
              {([
                ['haute', 'Priorité haute', 'var(--danger)'],
                ['normale', 'Priorité normale', 'var(--tint)'],
                ['basse', 'Priorité basse', 'var(--secondary-label)']
              ] as const).map(([p, label, color]) => {
                const items = lists.today.filter(t => t.priority === p)
                if (items.length === 0) return null
                return (
                  <div key={p}>
                    <h3 className="section-header" style={{ marginTop: 14, fontSize: 15 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
                        <span className="cat-dot" style={{ background: color }} />
                        {label} · {items.length}
                      </span>
                    </h3>
                    <div className="list-group">{items.map(t => taskRow(t))}</div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="list-group">{lists[section].map(t => taskRow(t))}</div>
          )
        )}
      </div>

      {editing && (
        <TaskEditor
          task={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/** Agenda des 7 prochains jours, puis « Plus tard » et « Sans date ». */
function UpcomingAgenda({ tasks, today, onEdit, onComplete }: {
  tasks: Task[]
  today: string
  onEdit: (t: Task) => void
  onComplete: (t: Task) => void
}) {
  const groups: Array<{ label: string; items: Task[] }> = []
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i)
    const items = tasks.filter(t => t.plannedDate === date)
    if (items.length) {
      const label = relativeLabel(date, today)
      groups.push({ label: label.charAt(0).toUpperCase() + label.slice(1), items })
    }
  }
  const later = tasks.filter(t => t.plannedDate && t.plannedDate > addDays(today, 7))
  if (later.length) groups.push({ label: 'Plus tard', items: later })
  const noDate = tasks.filter(t => !t.plannedDate)
  if (noDate.length) groups.push({ label: 'Sans date', items: noDate })

  return (
    <>
      {groups.map(g => (
        <div key={g.label}>
          <h3 className="section-header" style={{ marginTop: 16 }}>{g.label}</h3>
          <div className="list-group">
            {g.items.map(t => (
              <div key={t.id} className="list-row">
                <button className="check-btn" aria-label={`Terminer « ${t.title} »`} onClick={() => onComplete(t)}>
                  <span className="check-circle"><Icon name="check" size={14} /></span>
                </button>
                <span className="cat-bar" style={{ background: categoryBarColor(t.category) }} aria-hidden="true" />
                <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => onEdit(t)}>
                  <span className="row-title" style={{ display: 'block' }}>{t.title}</span>
                  {(t.plannedTime || t.deadline || categoryOf(t.category)) && (
                    <span className="row-sub">
                      {categoryOf(t.category) ? `${categoryOf(t.category)!.label}` : ''}
                      {categoryOf(t.category) && (t.plannedTime || t.deadline) ? ' · ' : ''}
                      {t.plannedTime ?? ''}{t.plannedTime && t.deadline ? ' · ' : ''}
                      {t.deadline ? `échéance ${relativeLabel(t.deadline, today)}` : ''}
                    </span>
                  )}
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
          </div>
        </div>
      ))}
    </>
  )
}

export function TaskEditor({ task, onClose, defaults, onSaved }: {
  task: Task | null
  onClose: () => void
  defaults?: Partial<Task>
  onSaved?: () => void
}) {
  const { state, update, updateUndoable, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [title, setTitle] = useState(task?.title ?? defaults?.title ?? '')
  const [note, setNote] = useState(task?.note ?? '')
  const [plannedDate, setPlannedDate] = useState(task?.plannedDate ?? defaults?.plannedDate ?? '')
  const [plannedTime, setPlannedTime] = useState(task?.plannedTime ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [durationMin, setDurationMin] = useState(task?.durationMin ? String(task.durationMin) : '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'normale')
  // nouvelle tâche : reprend la dernière catégorie utilisée (moins de saisie)
  const [category, setCategory] = useState(() => task?.category ?? defaults?.category
    ?? (() => { try { return localStorage.getItem('cap-last-cat') ?? '' } catch { return '' } })())
  const [repeat, setRepeat] = useState<Task['repeat']>(task?.repeat ?? null)
  const [someday, setSomeday] = useState(task?.someday ?? false)
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [subjectId, setSubjectId] = useState(task?.subjectId ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  // options avancées repliées, sauf si la tâche en utilise déjà une
  const [moreOpen, setMoreOpen] = useState(() => Boolean(
    task && (task.plannedTime || task.deadline || task.durationMin || task.note
      || task.projectId || task.subjectId || task.someday)
  ))

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) { toast('Un titre est nécessaire.'); return }
    const fields = {
      title: trimmed, note: note.trim(),
      plannedDate: plannedDate || null, plannedTime: plannedTime || null,
      deadline: deadline || null,
      durationMin: durationMin ? Math.max(1, parseInt(durationMin, 10) || 0) : null,
      priority, category: category || null, someday, repeat: repeat || null,
      projectId: projectId || null, subjectId: subjectId || null
    }
    if (task) {
      update(s => ({ ...s, tasks: s.tasks.map(t => t.id === task.id ? { ...t, ...fields } : t) }))
    } else {
      update(s => ({
        ...s,
        tasks: [...s.tasks, {
          id: newId('task'), ...fields, energy: null,
          top3Rank: null, top3Date: null, done: false,
          createdAt: nowISO(), completedAt: null, deletedAt: null
        }]
      }))
    }
    try { localStorage.setItem('cap-last-cat', category || '') } catch { /* stockage indisponible */ }
    onSaved?.()
    onClose()
  }

  const remove = () => {
    if (!task) return
    updateUndoable(`« ${task.title} » supprimée.`, s => ({
      ...s, tasks: s.tasks.map(t => t.id === task.id ? { ...t, deletedAt: nowISO() } : t)
    }))
    onClose()
  }

  return (
    <Sheet title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose={onClose}>
      <label className="field-label" htmlFor="te-title">Titre</label>
      <input id="te-title" className="field" value={title} onChange={e => setTitle(e.target.value)} autoFocus={!task} />

      <span className="field-label">Catégorie</span>
      <div className="chip-row" role="group" aria-label="Catégorie">
        <button type="button" className="chip" aria-pressed={!category} onClick={() => setCategory('')}>Aucune</button>
        {TASK_CATEGORIES.map(c => (
          <button key={c.id} type="button" className="chip" aria-pressed={category === c.id}
            onClick={() => setCategory(category === c.id ? '' : c.id)}
            style={category === c.id ? { background: c.color, color: '#fff' } : undefined}>
            <span className="cat-dot" style={{ background: category === c.id ? '#fff' : c.color, marginRight: 6 }} />
            {c.label}
          </button>
        ))}
      </div>

      <DateField label="Je veux la faire le… (facultatif)" value={plannedDate} onChange={setPlannedDate} />

      <label className="field-label">Priorité</label>
      <Segmented label="Priorité" value={priority} onChange={setPriority}
        options={[{ value: 'basse', label: 'Basse' }, { value: 'normale', label: 'Normale' }, { value: 'haute', label: 'Haute' }]} />

      <span className="field-label">Répéter</span>
      <ChoiceChips
        label="Répéter" allowNone="Jamais"
        options={[
          { value: 'daily', label: 'Chaque jour' },
          { value: 'weekly', label: 'Chaque semaine' },
          { value: 'monthly', label: 'Chaque mois' }
        ]}
        value={repeat ?? ''}
        onChange={v => setRepeat((v || null) as Task['repeat'])}
      />
      {repeat && (
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '6px 2px 0' }}>
          Terminer cette tâche créera automatiquement la prochaine occurrence.
        </p>
      )}

      {!moreOpen ? (
        <button className="btn-plain btn-block" style={{ minHeight: 44, marginTop: 12 }}
          aria-expanded={false} onClick={() => setMoreOpen(true)}>
          Plus d'options…
        </button>
      ) : (
        <>
          <TimeField label="Heure (facultatif, pour la timeline)" value={plannedTime} onChange={setPlannedTime} />
          <DateField label="Échéance réelle — doit être fini avant (facultatif)" value={deadline} onChange={setDeadline} />

          <label className="field-label" htmlFor="te-duration">Durée estimée (min, facultatif)</label>
          <input id="te-duration" className="field" type="number" inputMode="numeric" value={durationMin} onChange={e => setDurationMin(e.target.value)} />

          {state.projects.length > 0 && (
            <>
              <span className="field-label">Projet</span>
              <ChoiceChips
                label="Projet" allowNone="Aucun"
                options={state.projects.filter(p => p.status !== 'termine').map(p => ({ value: p.id, label: p.name }))}
                value={projectId} onChange={setProjectId}
              />
            </>
          )}
          {state.subjects.length > 0 && (
            <>
              <span className="field-label">Matière</span>
              <ChoiceChips
                label="Matière" allowNone="Aucune"
                options={state.subjects.map(s => ({ value: s.id, label: s.name }))}
                value={subjectId} onChange={setSubjectId}
              />
            </>
          )}

          <label className="field-label" htmlFor="te-note">Note</label>
          <textarea id="te-note" className="field" rows={2} value={note} onChange={e => setNote(e.target.value)} />

          <button className="list-row" style={{ marginTop: 12, borderRadius: 12, background: 'var(--tertiary-system-background)' }}
            onClick={() => setSomeday(!someday)} aria-pressed={someday}>
            <span className={`check-circle${someday ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
            <span className="row-main"><span className="row-title">Un jour peut-être</span>
              <span className="row-sub">Hors des listes actives, garde l'idée</span></span>
          </button>
        </>
      )}

      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>

      {task && (
        <div className="list-group" style={{ marginTop: 16 }}>
          {!task.done && (
            <button className="list-row" onClick={() => {
              const tomorrow = addDays(todayISO(state.profile.timezone), 1)
              update(s => ({
                ...s,
                tasks: s.tasks.map(t => t.id === task.id ? { ...t, plannedDate: tomorrow, top3Date: null, top3Rank: null } : t)
              }))
              toast('Reportée à demain.')
              onClose()
            }}>
              <Icon name="chevronRight" size={18} className="chevron" />
              <span className="row-main"><span className="row-title">Reporter à demain</span></span>
            </button>
          )}
          <button className="list-row" onClick={() => {
            update(s => ({
              ...s,
              tasks: [...s.tasks, {
                ...task, id: newId('task'), title: `${task.title} (copie)`,
                done: false, completedAt: null, top3Rank: null, top3Date: null,
                createdAt: nowISO(), deletedAt: null
              }]
            }))
            toast('Tâche dupliquée.')
            onClose()
          }}>
            <Icon name="capture" size={18} className="chevron" />
            <span className="row-main"><span className="row-title">Dupliquer la tâche</span></span>
          </button>
          {!confirmDelete ? (
            <button className="list-row" onClick={() => setConfirmDelete(true)}>
              <span style={{ color: 'var(--danger)', display: 'flex' }}><Icon name="trash" size={18} /></span>
              <span className="row-main"><span className="row-title" style={{ color: 'var(--danger)' }}>Supprimer la tâche</span></span>
            </button>
          ) : (
            <div className="list-row" style={{ gap: 8 }}>
              <button className="btn btn-danger" style={{ flex: 1, minHeight: 40 }} onClick={remove}>Confirmer</button>
              <button className="btn btn-secondary" style={{ flex: 1, minHeight: 40 }} onClick={() => setConfirmDelete(false)}>Garder</button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

function InboxView() {
  const { state, update, updateUndoable, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const inbox = state.captures.filter(c => !c.processedAt)
  const current = inbox[0] ?? null
  const [asTask, setAsTask] = useState<Capture | null>(null)

  const markProcessed = (c: Capture, message: string) => {
    update(s => ({
      ...s,
      captures: s.captures.map(x => x.id === c.id ? { ...x, processedAt: nowISO() } : x)
    }))
    toast(message)
  }

  const toTask = (c: Capture, when: string | null) => {
    update(s => ({
      ...s,
      captures: s.captures.map(x => x.id === c.id ? { ...x, processedAt: nowISO() } : x),
      tasks: [...s.tasks, {
        id: newId('task'), title: c.text.slice(0, 200), note: '', plannedDate: when,
        deadline: null, plannedTime: null, durationMin: null, energy: null,
        priority: 'normale' as const, projectId: null, subjectId: null, someday: when === null,
        top3Rank: null, top3Date: null, done: false,
        createdAt: nowISO(), completedAt: null, deletedAt: null
      }]
    }))
    toast(when ? 'Tâche planifiée.' : 'Rangée dans « Un jour ».')
  }

  const toNote = (c: Capture) => {
    update(s => ({
      ...s,
      captures: s.captures.map(x => x.id === c.id ? { ...x, processedAt: nowISO() } : x),
      journalEntries: [...s.journalEntries, {
        id: newId('j'), date: today, format: 'libre' as const, text: c.text, createdAt: nowISO()
      }]
    }))
    toast('Enregistré dans le journal.')
  }

  const remove = (c: Capture) => {
    updateUndoable('Élément supprimé.', s => ({
      ...s, captures: s.captures.map(x => x.id === c.id ? { ...x, processedAt: nowISO() } : x)
    }))
  }

  return (
    <div className="screen">
      <BackHeader title="Inbox" onBack={() => ui.setSub('plan', null)} />
      {inbox.length === 0 ? (
        <EmptyState title="Rien à trier">Ton esprit peut rester ailleurs.</EmptyState>
      ) : (
        <>
          <p className="subtitle-context">{inbox.length} élément{inbox.length > 1 ? 's' : ''} — un par un, sans pression.</p>
          {current && (
            <div className="card" key={current.id}>
              <p style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 16 }}>{current.text}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => toTask(current, today)}>Faire aujourd'hui</button>
                <button className="btn btn-secondary" onClick={() => toTask(current, addDays(today, 1))}>Demain</button>
                <button className="btn btn-secondary" onClick={() => setAsTask(current)}>Planifier…</button>
                <button className="btn btn-secondary" onClick={() => toTask(current, null)}>Un jour</button>
                <button className="btn btn-secondary" onClick={() => toNote(current)}>Note de journal</button>
                <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => remove(current)}>Supprimer</button>
              </div>
              <button className="btn-plain btn-block" style={{ marginTop: 12, minHeight: 44 }}
                onClick={() => markProcessed(current, 'Gardé pour plus tard — il reviendra à la prochaine revue.')}>
                Clarifier plus tard
              </button>
            </div>
          )}
        </>
      )}
      {asTask && (
        <TaskEditor
          task={null}
          defaults={{ title: asTask.text }}
          onSaved={() => markProcessed(asTask, 'Converti en tâche.')}
          onClose={() => setAsTask(null)}
        />
      )}
    </div>
  )
}

export function BackHeader({ title, onBack, action, onAction }: {
  title: string
  onBack: () => void
  action?: string
  onAction?: () => void
}) {
  const headRef = React.useRef<HTMLDivElement>(null)
  const onBackRef = React.useRef(onBack)
  onBackRef.current = onBack

  // Glisser depuis le bord gauche pour revenir (geste iOS natif).
  // L'écran suit le doigt ; relâcher au-delà de 90 px déclenche le retour.
  React.useEffect(() => {
    const screen = headRef.current?.closest('.screen') as HTMLElement | null
    if (!screen) return
    let startX = 0, startY = 0, armed = false, moved = false
    const reset = (animate: boolean) => {
      screen.style.transition = animate ? 'transform 240ms var(--ease-spring)' : ''
      screen.style.transform = ''
      if (animate) window.setTimeout(() => { screen.style.transition = '' }, 260)
    }
    const onDown = (e: PointerEvent) => {
      if (e.clientX > 44 || screen.offsetParent === null) return
      // sheet ou recherche ouverte (elles verrouillent le défilement) : pas de geste retour
      if (document.body.style.overflow === 'hidden') return
      armed = true; moved = false; startX = e.clientX; startY = e.clientY
    }
    const onMove = (e: PointerEvent) => {
      if (!armed) return
      const dx = e.clientX - startX, dy = e.clientY - startY
      if (!moved) {
        if (Math.abs(dx) < 12) return
        if (Math.abs(dy) > Math.abs(dx)) { armed = false; return } // défilement vertical
        moved = true
        screen.style.transition = 'none'
      }
      screen.style.transform = `translateX(${Math.max(0, dx)}px)`
    }
    const onUp = (e: PointerEvent) => {
      if (!armed) return
      const dx = e.clientX - startX
      armed = false
      if (moved && dx > 90) {
        reset(false)
        onBackRef.current()
      } else if (moved) {
        reset(true)
      }
      moved = false
    }
    const onCancel = () => { if (moved) reset(true); armed = false; moved = false }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [])

  return (
    <div className="back-header" ref={headRef}>
      <button className="btn-plain" onClick={onBack} style={{ display: 'flex', alignItems: 'center', minHeight: 44, marginLeft: -8, justifySelf: 'start' }}>
        <Icon name="chevronLeft" size={22} /> Retour
      </button>
      <h1 className="back-header-title">{title}</h1>
      {action ? <button className="btn-add-pill" style={{ minHeight: 36, justifySelf: 'end' }} onClick={onAction}>{action}</button> : <span />}
    </div>
  )
}

function ProjectsView() {
  const { state, update } = useApp()
  const ui = useUi()
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const projects = state.projects.filter(p => p.status !== 'termine')

  return (
    <div className="screen">
      <BackHeader title="Projets" onBack={() => ui.setSub('plan', null)} action="Nouveau" onAction={() => setEditing('new')} />
      {projects.length === 0 ? (
        <EmptyState title="Aucun projet">
          Un projet = un résultat attendu + une prochaine action visible.
        </EmptyState>
      ) : (
        <div className="list-group">
          {projects.map(p => (
            <button key={p.id} className="list-row" onClick={() => setEditing(p)}>
              <span className="row-main">
                <span className="row-title">{p.name}</span>
                <span className="row-sub">
                  {p.nextAction ? `Prochaine action : ${p.nextAction}` : 'Aucune prochaine action — à clarifier en revue'}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className="chevron" />
            </button>
          ))}
        </div>
      )}
      {editing && <ProjectEditor project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ProjectEditor({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { update, toast } = useApp()
  const [name, setName] = useState(project?.name ?? '')
  const [outcome, setOutcome] = useState(project?.outcome ?? '')
  const [nextAction, setNextAction] = useState(project?.nextAction ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')

  const save = () => {
    if (!name.trim()) { toast('Un nom est nécessaire.'); return }
    if (project) {
      update(s => ({
        ...s,
        projects: s.projects.map(p => p.id === project.id
          ? { ...p, name: name.trim(), outcome: outcome.trim(), nextAction: nextAction.trim(), deadline: deadline || null, notes }
          : p)
      }))
    } else {
      update(s => ({
        ...s,
        projects: [...s.projects, {
          id: newId('proj'), name: name.trim(), outcome: outcome.trim(), nextAction: nextAction.trim(),
          deadline: deadline || null, status: 'actif' as const, notes, createdAt: nowISO()
        }]
      }))
    }
    onClose()
  }

  const finishProject = () => {
    if (!project) return
    update(s => ({ ...s, projects: s.projects.map(p => p.id === project.id ? { ...p, status: 'termine' as const } : p) }))
    toast('Projet terminé. Bien joué.')
    onClose()
  }

  return (
    <Sheet title={project ? 'Projet' : 'Nouveau projet'} onClose={onClose}>
      <label className="field-label" htmlFor="pe-name">Nom</label>
      <input id="pe-name" className="field" value={name} onChange={e => setName(e.target.value)} />
      <label className="field-label" htmlFor="pe-outcome">Résultat attendu</label>
      <input id="pe-outcome" className="field" value={outcome} onChange={e => setOutcome(e.target.value)}
        placeholder="À quoi ressemble « fini » ?" />
      <label className="field-label" htmlFor="pe-next">Prochaine action</label>
      <input id="pe-next" className="field" value={nextAction} onChange={e => setNextAction(e.target.value)}
        placeholder="La toute prochaine étape concrète" />
      <DateField label="Échéance (facultatif)" value={deadline} onChange={setDeadline} />
      <label className="field-label" htmlFor="pe-notes">Notes et ressources</label>
      <textarea id="pe-notes" className="field" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
      {project && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={finishProject}>
          Marquer comme terminé
        </button>
      )}
    </Sheet>
  )
}

function GoalsView() {
  const { state } = useApp()
  const ui = useUi()
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const goals = state.goals.filter(g => !g.done)

  return (
    <div className="screen">
      <BackHeader title="Objectifs" onBack={() => ui.setSub('plan', null)} action="Nouveau" onAction={() => setEditing('new')} />
      {goals.length === 0 ? (
        <EmptyState title="Aucun objectif">
          Un bon objectif a un résultat, un indicateur concret et une prochaine action.
        </EmptyState>
      ) : (
        <div className="list-group">
          {goals.map(g => (
            <button key={g.id} className="list-row" onClick={() => setEditing(g)}>
              <span className="row-main">
                <span className="row-title">{g.result}</span>
                <span className="row-sub">{g.nextAction ? `Prochaine action : ${g.nextAction}` : g.indicator}</span>
              </span>
              <Icon name="chevronRight" size={16} className="chevron" />
            </button>
          ))}
        </div>
      )}
      {editing && <GoalEditor goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function GoalEditor({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { update, toast } = useApp()
  const [result, setResult] = useState(goal?.result ?? '')
  const [reason, setReason] = useState(goal?.reason ?? '')
  const [indicator, setIndicator] = useState(goal?.indicator ?? '')
  const [horizon, setHorizon] = useState(goal?.horizon ?? '')
  const [nextAction, setNextAction] = useState(goal?.nextAction ?? '')
  const [obstacles, setObstacles] = useState(goal?.obstacles ?? '')
  const [ifThenPlan, setIfThenPlan] = useState(goal?.ifThenPlan ?? '')

  const save = () => {
    if (!result.trim()) { toast('Décris le résultat visé.'); return }
    const fields = {
      result: result.trim(), reason: reason.trim(), indicator: indicator.trim(),
      horizon: horizon || null, nextAction: nextAction.trim(),
      obstacles: obstacles.trim(), ifThenPlan: ifThenPlan.trim()
    }
    if (goal) {
      update(s => ({ ...s, goals: s.goals.map(g => g.id === goal.id ? { ...g, ...fields } : g) }))
    } else {
      update(s => ({ ...s, goals: [...s.goals, { id: newId('goal'), ...fields, createdAt: nowISO(), done: false }] }))
    }
    onClose()
  }

  return (
    <Sheet title={goal ? 'Objectif' : 'Nouvel objectif'} onClose={onClose}>
      <label className="field-label" htmlFor="ge-result">Résultat visé</label>
      <input id="ge-result" className="field" value={result} onChange={e => setResult(e.target.value)}
        placeholder="ex. Valider le S1 du PASS" />
      <label className="field-label" htmlFor="ge-reason">Pourquoi c'est important</label>
      <input id="ge-reason" className="field" value={reason} onChange={e => setReason(e.target.value)} />
      <label className="field-label" htmlFor="ge-indicator">Indicateur concret</label>
      <input id="ge-indicator" className="field" value={indicator} onChange={e => setIndicator(e.target.value)}
        placeholder="ex. % de QCM réussis par chapitre" />
      <DateField label="Horizon (facultatif)" value={horizon} onChange={setHorizon} />
      <label className="field-label" htmlFor="ge-next">Prochaine action</label>
      <input id="ge-next" className="field" value={nextAction} onChange={e => setNextAction(e.target.value)} />
      <label className="field-label" htmlFor="ge-obstacles">Obstacles probables</label>
      <input id="ge-obstacles" className="field" value={obstacles} onChange={e => setObstacles(e.target.value)} />
      <label className="field-label" htmlFor="ge-ifthen">Plan « si… alors… »</label>
      <input id="ge-ifthen" className="field" value={ifThenPlan} onChange={e => setIfThenPlan(e.target.value)}
        placeholder="Si je décroche 3 jours, alors je reprends par une session de 25 min" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
      {goal && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={() => {
          update(s => ({ ...s, goals: s.goals.map(g => g.id === goal.id ? { ...g, done: true } : g) }))
          toast('Objectif atteint. Bien joué.')
          onClose()
        }}>
          Marquer comme atteint
        </button>
      )}
    </Sheet>
  )
}
