// Fermeture du soir : 3 à 5 minutes, quatre étapes simples.

import React, { useState } from 'react'
import { Sheet } from './Sheet'
import { useApp } from '../state/store'
import { newId } from '../lib/id'
import { nowISO, todayISO, addDays } from '../lib/dates'

export function EveningSheet({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const [step, setStep] = useState(0)
  const [dump, setDump] = useState('')
  const [firstAction, setFirstAction] = useState('')
  const today = todayISO(state.profile.timezone)
  const tomorrow = addDays(today, 1)

  const finish = () => {
    update(s => {
      let next = s
      if (dump.trim()) {
        next = {
          ...next,
          captures: [...next.captures, { id: newId('cap'), text: dump.trim(), kind: null, createdAt: nowISO(), processedAt: null }]
        }
      }
      if (firstAction.trim()) {
        next = {
          ...next,
          tasks: [...next.tasks, {
            id: newId('task'), title: firstAction.trim(), note: '', plannedDate: tomorrow,
            deadline: null, plannedTime: null, durationMin: null, energy: null,
            priority: 'haute', projectId: null, subjectId: null, someday: false,
            top3Rank: 1, top3Date: tomorrow, done: false,
            createdAt: nowISO(), completedAt: null, deletedAt: null
          }]
        }
      }
      next = {
        ...next,
        journalEntries: [...next.journalEntries, {
          id: newId('j'), date: today, format: 'phrase' as const,
          text: '[fermeture] Routine du soir faite.', createdAt: nowISO()
        }]
      }
      return next
    })
    toast('Fermeture du soir terminée. Bonne nuit.')
    onClose()
  }

  const steps = [
    <div key="0">
      <label className="field-label" htmlFor="ev-dump">1 · Vider la tête</label>
      <textarea id="ev-dump" className="field" rows={3} autoFocus value={dump} onChange={e => setDump(e.target.value)}
        placeholder="Tout ce qui tourne encore — ça part dans l'Inbox, pas dans ta nuit" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={() => setStep(1)}>Continuer</button>
    </div>,
    <div key="1">
      <label className="field-label" htmlFor="ev-first">2 · Première action de demain</label>
      <input id="ev-first" className="field" value={firstAction} onChange={e => setFirstAction(e.target.value)}
        placeholder="ex. Rappel actif — Anatomie membre supérieur" />
      <p style={{ color: 'var(--secondary-label)', fontSize: 14, marginTop: 8 }}>
        Elle deviendra la priorité n°1 du Top 3 de demain.
      </p>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={() => setStep(2)}>Continuer</button>
    </div>,
    <div key="2">
      <p style={{ fontSize: 17, lineHeight: 1.5 }}>3 · Prépare le terrain :</p>
      <ul style={{ color: 'var(--secondary-label)', lineHeight: 1.9, paddingLeft: 20, marginTop: 8 }}>
        <li>réveil réglé pour {state.profile.wakeTarget}</li>
        <li>téléphone à charger hors de portée du lit</li>
        <li>une activité calme pour finir (lecture, musique douce)</li>
      </ul>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={finish}>Terminer</button>
    </div>
  ]

  return (
    <Sheet title="Fermeture du soir" onClose={onClose}>
      {steps[step]}
    </Sheet>
  )
}
