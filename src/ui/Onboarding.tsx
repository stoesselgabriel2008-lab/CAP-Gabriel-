// Onboarding : ~1 minute, skippable, tout est prérempli.

import React, { useRef, useState } from 'react'
import { useApp } from '../state/store'
import { isValidCivil } from '../lib/dates'
import { Segmented } from './Sheet'
import { validateImport, mergeStates } from '../domain/backup'
import type { Profile } from '../domain/types'

export function Onboarding() {
  const { state, update, toast } = useApp()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState(state.profile.firstName)
  const [birthDate, setBirthDate] = useState(state.profile.birthDate)
  const [startDate, setStartDate] = useState(state.commitment.startDate)
  const [priority, setPriority] = useState<Profile['priority']>('pass')
  const [wakeTarget, setWakeTarget] = useState('07:00')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const finish = () => {
    if (!isValidCivil(birthDate)) { setError('Date de naissance invalide.'); return }
    if (!isValidCivil(startDate)) { setError('Date de départ invalide.'); return }
    update(s => ({
      ...s,
      profile: { ...s.profile, firstName: firstName.trim() || 'Gabriel', birthDate, priority, wakeTarget },
      commitment: { ...s.commitment, startDate, originalStart: startDate },
      settings: { ...s.settings, onboardingDone: true }
    }))
  }

  const importFile = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) { setError('Fichier trop volumineux (max 20 Mo).'); return }
      const text = await file.text()
      const preview = validateImport(JSON.parse(text))
      if (!preview.valid || !preview.state) {
        setError(preview.error ?? 'Sauvegarde non reconnue.')
        return
      }
      const imported = preview.state
      update(s => ({
        ...mergeStates(imported, s),
        profile: imported.profile,
        commitment: imported.commitment,
        settings: { ...imported.settings, onboardingDone: true }
      }))
      toast('Sauvegarde importée.')
    } catch {
      setError('Ce fichier ne correspond pas à une sauvegarde Cap reconnue. Aucune donnée n\'a été modifiée.')
    }
  }

  const steps: React.ReactNode[] = [
    // 0 — bienvenue
    <div key="0">
      <h1 style={{ fontSize: 34, marginBottom: 12 }}>Bienvenue dans Cap</h1>
      <p style={{ color: 'var(--secondary-label)', fontSize: 17, lineHeight: 1.5 }}>
        Ton cockpit personnel : révisions, plan du jour, focus, sommeil et engagement.
        Tout reste sur cet appareil. Pas de compte, pas de serveur.
      </p>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 32 }} onClick={() => setStep(1)}>
        Commencer
      </button>
    </div>,

    // 1 — identité
    <div key="1">
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Ton profil</h1>
      <p style={{ color: 'var(--secondary-label)', marginBottom: 8 }}>Tout est prérempli, corrige si besoin.</p>
      <label className="field-label" htmlFor="ob-name">Prénom</label>
      <input id="ob-name" className="field" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
      <label className="field-label" htmlFor="ob-birth">Date de naissance</label>
      <input id="ob-birth" className="field" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 8 }}>Fuseau horaire : Europe/Paris</p>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 24 }} onClick={() => setStep(2)}>Continuer</button>
    </div>,

    // 2 — engagement + priorité
    <div key="2">
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Ton cap</h1>
      <label className="field-label" htmlFor="ob-start">Départ de ton engagement personnel</label>
      <input id="ob-start" className="field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      <label className="field-label">Priorité actuelle</label>
      <Segmented
        label="Priorité actuelle"
        value={priority}
        onChange={setPriority}
        options={[
          { value: 'pass', label: 'PASS' },
          { value: 'sommeil', label: 'Sommeil' },
          { value: 'controle', label: 'Contrôle' },
          { value: 'forme', label: 'Forme' },
          { value: 'social', label: 'Social' }
        ]}
      />
      <label className="field-label" htmlFor="ob-wake">Heure de lever cible</label>
      <input id="ob-wake" className="field" type="time" value={wakeTarget} onChange={e => setWakeTarget(e.target.value)} />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 24 }} onClick={() => setStep(3)}>Continuer</button>
    </div>,

    // 3 — données + import + fin
    <div key="3">
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Tes données restent ici</h1>
      <p style={{ color: 'var(--secondary-label)', lineHeight: 1.5 }}>
        Cap stocke tout localement dans ce navigateur, sur cet appareil.
        Personne d'autre n'y a accès — mais si tu supprimes les données de Safari,
        elles disparaissent aussi. Un export régulier est recommandé (Moi → Données).
      </p>
      <input
        ref={fileRef} type="file" accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f) }}
      />
      <button className="btn btn-secondary btn-block" style={{ marginTop: 24 }} onClick={() => fileRef.current?.click()}>
        Importer une sauvegarde (facultatif)
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 12 }} onClick={finish}>
        C'est parti
      </button>
    </div>
  ]

  return (
    <div className="onboarding">
      {step > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <button className="btn-plain" onClick={() => setStep(step - 1)}>Retour</button>
          <button className="btn-plain" onClick={finish}>Passer</button>
        </div>
      )}
      {error && step !== 3 && <p className="field-error" role="alert">{error}</p>}
      {steps[step]}
    </div>
  )
}
