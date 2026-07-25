// Check-in : 10 à 20 secondes, aucun texte obligatoire.

import React, { useState } from 'react'
import { Sheet, Segmented } from './Sheet'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { newId } from '../lib/id'
import { nowISO, todayISO } from '../lib/dates'
import type { CheckIn, Energy } from '../domain/types'

export function CheckInSheet({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const [energy, setEnergy] = useState<Energy | null>(null)
  const [stress, setStress] = useState<CheckIn['stress'] | null>(null)
  const [sleepFelt, setSleepFelt] = useState<CheckIn['sleepFelt'] | null>(null)
  const [urge, setUrge] = useState(0)
  const [mood, setMood] = useState('')

  const canSave = energy && stress && sleepFelt

  const save = () => {
    if (!canSave) return
    const entry: CheckIn = {
      id: newId('ci'),
      date: todayISO(state.profile.timezone),
      at: nowISO(),
      energy: energy!, stress: stress!, sleepFelt: sleepFelt!,
      urge, mood: mood.trim()
    }
    update(s => ({ ...s, checkIns: [...s.checkIns, entry] }))
    onClose()
    if (urge >= 8) {
      ui.openSOS()
    } else if (energy === 'basse') {
      toast('Énergie basse : Cap te propose des sessions courtes de rappel.')
    } else {
      toast('Check-in enregistré. Recommandation mise à jour.')
    }
  }

  return (
    <Sheet title="Check-in" onClose={onClose}>
      <label className="field-label">Énergie</label>
      <Segmented label="Énergie" value={energy} onChange={setEnergy}
        options={[{ value: 'basse', label: 'Basse' }, { value: 'moyenne', label: 'Moyenne' }, { value: 'haute', label: 'Haute' }]} />

      <label className="field-label">Stress</label>
      <Segmented label="Stress" value={stress} onChange={setStress}
        options={[{ value: 'bas', label: 'Bas' }, { value: 'moyen', label: 'Moyen' }, { value: 'haut', label: 'Haut' }]} />

      <label className="field-label">Sommeil ressenti</label>
      <Segmented label="Sommeil ressenti" value={sleepFelt} onChange={setSleepFelt}
        options={[{ value: 'mauvais', label: 'Mauvais' }, { value: 'moyen', label: 'Moyen' }, { value: 'bon', label: 'Bon' }]} />

      <label className="field-label" htmlFor="ci-urge">Envie liée à ton engagement : {urge}/10</label>
      <input id="ci-urge" type="range" min={0} max={10} value={urge}
        onChange={e => setUrge(Number(e.target.value))}
        aria-valuetext={`${urge} sur 10`} />

      <label className="field-label" htmlFor="ci-mood">Humeur (facultatif)</label>
      <input id="ci-mood" className="field" value={mood} onChange={e => setMood(e.target.value)}
        placeholder="Un mot si tu veux" />

      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 24 }}
        disabled={!canSave} onClick={save}>
        Enregistrer
      </button>
      {urge >= 8 && (
        <p style={{ color: 'var(--secondary-label)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
          Envie élevée : le SOS s'ouvrira après l'enregistrement.
        </p>
      )}
    </Sheet>
  )
}
