// Notes : pages de texte durables (cours, fiches, idées longues), épinglables,
// liées à une matière ou un projet, recherchables depuis le centre de commande.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, SectionHeader, EmptyState, ChoiceChips } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { todayISO, nowISO } from '../lib/dates'
import { newId } from '../lib/id'
import type { Note } from '../domain/types'

export function NotesView() {
  const { state } = useApp()
  const ui = useUi()
  const [editing, setEditing] = useState<Note | 'new' | null>(null)
  const [query, setQuery] = useState('')

  const notes = useMemo(() => {
    const alive = state.notes.filter(n => !n.deletedAt)
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const filtered = query
      ? alive.filter(n => norm(n.title + ' ' + n.body).includes(norm(query)))
      : alive
    return [...filtered].sort((a, b) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt))
  }, [state.notes, query])

  return (
    <div className="screen">
      <BackHeader title="Notes" onBack={() => ui.setSub('plan', null)} action="Nouvelle" onAction={() => setEditing('new')} />
      <input className="field" type="search" placeholder="Rechercher dans les notes…"
        value={query} onChange={e => setQuery(e.target.value)} aria-label="Rechercher dans les notes" />

      {notes.length === 0 ? (
        <EmptyState title={query ? 'Aucune note trouvée' : 'Aucune note'}>
          {query
            ? `Rien ne correspond à « ${query} ».`
            : 'Fiches de cours, idées longues, choses à garder : les notes restent, contrairement à l\'Inbox qui se vide.'}
        </EmptyState>
      ) : (
        <div className="list-group" style={{ marginTop: 12 }}>
          {notes.map(n => (
            <button key={n.id} className="list-row" onClick={() => setEditing(n)}>
              {n.pinned && <span style={{ color: 'var(--tint)', display: 'flex' }}><Icon name="flag" size={16} /></span>}
              <span className="row-main">
                <span className="row-title">{n.title || 'Sans titre'}</span>
                <span className="row-sub">
                  {state.settings.hideSensitivePreviews ? '•••' : (n.body.slice(0, 80) || 'Vide')}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className="chevron" />
            </button>
          ))}
        </div>
      )}
      {editing && <NoteEditor note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const { state, update, updateUndoable, toast } = useApp()
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const [subjectId, setSubjectId] = useState(note?.subjectId ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = () => {
    if (!title.trim() && !body.trim()) { toast('Écris au moins un titre ou un contenu.'); return }
    const fields = {
      title: title.trim(), body, pinned,
      subjectId: subjectId || null, updatedAt: nowISO()
    }
    if (note) {
      update(s => ({ ...s, notes: s.notes.map(n => n.id === note.id ? { ...n, ...fields } : n) }))
    } else {
      update(s => ({
        ...s,
        notes: [...s.notes, {
          id: newId('note'), ...fields, projectId: null,
          createdAt: nowISO(), deletedAt: null
        }]
      }))
    }
    onClose()
  }

  return (
    <Sheet title={note ? 'Note' : 'Nouvelle note'} onClose={onClose} full>
      <label className="field-label" htmlFor="ne-title" style={{ marginTop: 0 }}>Titre</label>
      <input id="ne-title" className="field" value={title} onChange={e => setTitle(e.target.value)}
        autoFocus={!note} placeholder="ex. Fiche — voies de la douleur" />
      <label className="field-label" htmlFor="ne-body">Contenu</label>
      <textarea id="ne-body" className="field" rows={12} value={body} onChange={e => setBody(e.target.value)}
        placeholder="Ton texte, tes listes, tes idées — tout reste ici, sur ton appareil." />
      {state.subjects.length > 0 && (
        <>
          <span className="field-label">Matière (facultatif)</span>
          <ChoiceChips label="Matière" allowNone="Aucune"
            options={state.subjects.map(s => ({ value: s.id, label: s.name }))}
            value={subjectId} onChange={setSubjectId} />
        </>
      )}
      <button className="list-row" style={{ marginTop: 12, borderRadius: 12, background: 'var(--tertiary-system-background)' }}
        onClick={() => setPinned(!pinned)} aria-pressed={pinned}>
        <span className={`check-circle${pinned ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
        <span className="row-main"><span className="row-title">Épingler en haut</span></span>
      </button>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      {note && !confirmDelete && (
        <button className="btn-plain btn-block" style={{ color: 'var(--danger)', minHeight: 44, marginTop: 8 }}
          onClick={() => setConfirmDelete(true)}>
          Supprimer la note
        </button>
      )}
      {note && confirmDelete && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-danger btn-block" onClick={() => {
            updateUndoable('Note supprimée.', s => ({
              ...s, notes: s.notes.map(n => n.id === note.id ? { ...n, deletedAt: nowISO() } : n)
            }))
            onClose()
          }}>Confirmer la suppression</button>
          <button className="btn btn-secondary btn-block" onClick={() => setConfirmDelete(false)}>Garder</button>
        </div>
      )}
    </Sheet>
  )
}
