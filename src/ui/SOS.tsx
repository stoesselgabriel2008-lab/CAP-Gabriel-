// SOS : parcours critique. Une action par écran, texte large, utilisable
// d'une main, fermeture toujours possible, aucun contenu réseau (offline).

import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { useApp } from '../state/store'
import { newId } from '../lib/id'
import { nowISO, localHour } from '../lib/dates'
import type { UrgeEvent } from '../domain/types'

const EMOTIONS = ['Ennui', 'Stress', 'Fatigue', 'Solitude', 'Frustration', 'Autre']
const PLACES = ['Chambre', 'Salle de bain', 'Salon', 'Ailleurs']
const TRIGGERS = ['Téléphone au lit', 'Contenu déclencheur', 'Ennui', 'Stress', 'Fatigue', 'Solitude', 'Douche', 'Habitude automatique', 'Autre']

type Step = 'intro' | 'cut' | 'breathe' | 'name' | 'surf' | 'act' | 'done'

export function SOSFlow({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp()
  const [step, setStep] = useState<Step>('intro')
  const [intensity, setIntensity] = useState(7)
  const [intensityAfter, setIntensityAfter] = useState(5)
  const [emotion, setEmotion] = useState('')
  const [place, setPlace] = useState('')
  const [trigger, setTrigger] = useState('')
  const [helped, setHelped] = useState('')
  const [eventId] = useState(() => newId('urge'))

  const stepIndex = ['cut', 'breathe', 'name', 'surf', 'act'].indexOf(step)
  const isEvening = localHour(state.profile.timezone) >= 21

  const saveEvent = (completed: boolean) => {
    const event: UrgeEvent = {
      id: eventId, at: nowISO(),
      intensityBefore: intensity,
      intensityAfter: completed ? intensityAfter : null,
      emotion, place, trigger, helped, completed
    }
    update(s => ({
      ...s,
      urgeEvents: [...s.urgeEvents.filter(u => u.id !== eventId), event]
    }))
  }

  const close = () => {
    if (step !== 'intro' && step !== 'done') saveEvent(false)
    onClose()
  }

  return (
    <div className="sos-screen" role="dialog" aria-modal="true" aria-label="SOS">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-plain" onClick={close} style={{ minHeight: 44 }}>Fermer</button>
      </div>

      {stepIndex >= 0 && (
        <div className="sos-progress" aria-label={`Étape ${stepIndex + 1} sur 5`}>
          {[0, 1, 2, 3, 4].map(i => <span key={i} className={i <= stepIndex ? 'done' : ''} />)}
        </div>
      )}

      {step === 'intro' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 className="sos-step-title">Tu n'as rien à décider pour les dix prochaines minutes.</h1>
          <p className="sos-body" style={{ color: 'var(--secondary-label)' }}>On traverse juste la vague.</p>
          <button className="btn btn-danger btn-block btn-large" style={{ marginTop: 40 }} onClick={() => setStep('cut')}>
            Commencer
          </button>
          <button className="btn-plain" style={{ marginTop: 16, color: 'var(--secondary-label)' }} onClick={() => setStep('cut')}>
            Je suis en sécurité, mais l'envie est forte
          </button>
        </div>
      )}

      {step === 'cut' && (
        <StepFrame title="Couper le contexte" onNext={() => setStep('breathe')} nextLabel="C'est fait">
          <ul className="sos-body" style={{ paddingLeft: 24, lineHeight: 2 }}>
            <li>Lève-toi</li>
            <li>Pose le téléphone</li>
            <li>Change de pièce</li>
            <li>Ouvre les rideaux ou va dans un espace moins isolé</li>
          </ul>
          <Countdown seconds={30} />
        </StepFrame>
      )}

      {step === 'breathe' && (
        <StepFrame title="Faire redescendre" onNext={() => setStep('name')} nextLabel="Continuer">
          <p className="sos-body" style={{ color: 'var(--secondary-label)' }}>
            Suis le cercle : inspiration confortable, expiration plus longue.
          </p>
          <div className="breath-circle" aria-hidden="true" />
          <BreathTimer seconds={75} onDone={() => setStep('name')} />
        </StepFrame>
      )}

      {step === 'name' && (
        <StepFrame title="Nommer" onNext={() => setStep('surf')} nextLabel="Continuer">
          <label className="field-label" htmlFor="sos-int">Intensité : {intensity}/10</label>
          <input id="sos-int" type="range" min={0} max={10} value={intensity}
            onChange={e => setIntensity(Number(e.target.value))} aria-valuetext={`${intensity} sur 10`} />
          <ChipPicker label="Émotion" options={EMOTIONS} value={emotion} onChange={setEmotion} />
          <ChipPicker label="Lieu" options={PLACES} value={place} onChange={setPlace} />
          <ChipPicker label="Déclencheur" options={TRIGGERS} value={trigger} onChange={setTrigger} />
        </StepFrame>
      )}

      {step === 'surf' && (
        <StepFrame title="Surfer la vague" onNext={() => setStep('act')} nextLabel="La vague redescend">
          <p className="sos-body" style={{ color: 'var(--secondary-label)', marginBottom: 8 }}>
            L'objectif n'est pas de supprimer la pensée, mais de ne pas agir automatiquement.
            Une envie monte, atteint un pic, puis redescend — toujours.
          </p>
          <Wave />
          <label className="field-label" htmlFor="sos-now">Intensité maintenant : {intensityAfter}/10</label>
          <input id="sos-now" type="range" min={0} max={10} value={intensityAfter}
            onChange={e => setIntensityAfter(Number(e.target.value))} aria-valuetext={`${intensityAfter} sur 10`} />
        </StepFrame>
      )}

      {step === 'act' && (
        <StepFrame title="Une action, maintenant" onNext={() => { saveEvent(true); setStep('done') }} nextLabel="C'est fait">
          <div className="list-group" style={{ marginTop: 8 }}>
            {(isEvening
              ? ['Routine sommeil : lit sans téléphone', 'Douche', 'Eau + espace commun']
              : ['Marcher cinq minutes', 'Douche', 'Eau + espace commun']
            ).map(a => (
              <button key={a} className="list-row" aria-pressed={helped === a} onClick={() => setHelped(a)}>
                <span className={`check-circle${helped === a ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
                <span className="row-main"><span className="row-title">{a}</span></span>
              </button>
            ))}
          </div>
        </StepFrame>
      )}

      {step === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 className="sos-step-title">Bien joué.</h1>
          <p className="sos-body" style={{ color: 'var(--secondary-label)' }}>
            Tu n'as pas agi automatiquement. C'est exactement comme ça qu'un déclencheur perd de sa force —
            en répétant une autre réponse.
          </p>
          <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 32 }} onClick={onClose}>
            Terminer
          </button>
          <button className="btn-plain" style={{ marginTop: 16, color: 'var(--secondary-label)' }}
            onClick={() => { setStep('cut') }}>
            Encore dix minutes de protocole
          </button>
          <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 24, lineHeight: 1.5 }}>
            Si la perte de contrôle est fréquente ou te fait souffrir, en parler à une personne de confiance
            ou à un professionnel de santé est une vraie option — pas un échec.
          </p>
        </div>
      )}
    </div>
  )
}

function StepFrame({ title, children, onNext, nextLabel }: {
  title: string
  children: React.ReactNode
  onNext: () => void
  nextLabel: string
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h1 className="sos-step-title">{title}</h1>
      <div style={{ flex: 1 }}>{children}</div>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 24 }} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}

function Countdown({ seconds }: { seconds: number }) {
  const [end] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250)
    return () => clearInterval(id)
  }, [end])
  return (
    <p style={{ fontSize: 34, fontWeight: 300, textAlign: 'center', marginTop: 24, fontVariantNumeric: 'tabular-nums' }}
      role="timer">
      {left > 0 ? `${left} s` : 'Prends ton temps'}
    </p>
  )
}

function BreathTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [end] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(l)
    }, 250)
    return () => clearInterval(id)
  }, [end])
  return (
    <p style={{ textAlign: 'center', color: 'var(--secondary-label)', fontVariantNumeric: 'tabular-nums' }} role="timer">
      {left > 0 ? `${left} s` : 'Tu peux continuer quand tu veux'}
    </p>
  )
}

function Wave() {
  // vague sobre : montée, pic, descente — animation lente par transform
  return (
    <div className="wave-wrap" aria-hidden="true">
      <svg className="wave-svg" viewBox="0 0 300 100" preserveAspectRatio="none">
        <path
          d="M0 90 C 60 88, 90 20, 150 15 C 210 20, 240 88, 300 90"
          fill="none" stroke="var(--tint)" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle r="5" fill="var(--tint)">
          <animateMotion dur="14s" repeatCount="indefinite"
            path="M0 90 C 60 88, 90 20, 150 15 C 210 20, 240 88, 300 90" />
        </circle>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--tertiary-label)', fontSize: 12 }}>
        <span>montée</span><span>pic</span><span>descente</span>
      </div>
    </div>
  )
}

function ChipPicker({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(o => (
          <button key={o} aria-pressed={value === o}
            onClick={() => onChange(value === o ? '' : o)}
            style={{
              padding: '8px 14px', borderRadius: 999, fontSize: 15, minHeight: 38,
              background: value === o ? 'var(--tint)' : 'var(--tertiary-system-background)',
              color: value === o ? '#fff' : 'var(--label)',
              fontWeight: value === o ? 600 : 400
            }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
