// Capture universelle : un texte suffit, le reste est facultatif.
// Le classement (type, date, matière) peut se faire maintenant ou dans l'Inbox.

import React, { useState } from 'react'
import { Sheet, Segmented } from './Sheet'
import { useApp } from '../state/store'
import { newId } from '../lib/id'
import { nowISO, todayISO, addDays } from '../lib/dates'
import type { CaptureKind, Task } from '../domain/types'

const KINDS: Array<{ value: CaptureKind; label: string }> = [
  { value: 'task', label: 'Tâche' },
  { value: 'note', label: 'Note' },
  { value: 'idea', label: 'Idée' },
  { value: 'question', label: 'Question' }
]

export function CaptureSheet({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const [text, setText] = useState('')
  const [kind, setKind] = useState<CaptureKind | null>(null)
  const [when, setWhen] = useState<'none' | 'today' | 'tomorrow'>('none')
  const today = todayISO(state.profile.timezone)

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (kind === 'task') {
      const task: Task = {
        id: newId('task'), title: trimmed, note: '',
        plannedDate: when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : null,
        deadline: null, plannedTime: null, durationMin: null, energy: null,
        priority: 'normale', projectId: null, subjectId: null, someday: false,
        top3Rank: null, top3Date: null, done: false,
        createdAt: nowISO(), completedAt: null, deletedAt: null
      }
      update(s => ({ ...s, tasks: [...s.tasks, task] }))
      toast(when === 'none' ? 'Tâche créée.' : `Tâche planifiée ${when === 'today' ? "aujourd'hui" : 'demain'}.`)
    } else {
      update(s => ({
        ...s,
        captures: [...s.captures, {
          id: newId('cap'), text: trimmed, kind, createdAt: nowISO(), processedAt: null
        }]
      }))
      toast('Capturé dans l\'Inbox.')
    }
    onClose()
  }

  return (
    <Sheet title="Capturer" onClose={onClose}>
      <label className="field-label" htmlFor="capture-text">Qu'as-tu en tête ?</label>
      <textarea
        id="capture-text" className="field" autoFocus rows={3}
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Tâche, idée, question, chapitre à revoir…"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
      />
      <label className="field-label">Type (facultatif — sinon Inbox)</label>
      <Segmented label="Type" value={kind} onChange={setKind} options={KINDS} />
      {kind === 'task' && (
        <>
          <label className="field-label">Quand ?</label>
          <Segmented label="Quand" value={when} onChange={setWhen}
            options={[{ value: 'none', label: 'Plus tard' }, { value: 'today', label: "Aujourd'hui" }, { value: 'tomorrow', label: 'Demain' }]} />
        </>
      )}
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 24 }}
        disabled={!text.trim()} onClick={save}>
        Enregistrer
      </button>
    </Sheet>
  )
}
