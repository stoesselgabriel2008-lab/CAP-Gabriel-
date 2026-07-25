// Focus : démarrage (préréglages 25/50/90/personnalisé), écran de session
// plein écran, interruptions, fin de session avec preuve de travail.
// L'exactitude repose sur les timestamps (domain/timer.ts).

import React, { useEffect, useMemo, useState } from 'react'
import { Sheet, Segmented } from './Sheet'
import { Icon } from './Icon'
import { useApp } from '../state/store'
import { useUi, type TimerStartOpts } from '../app/ui-context'
import { startTimer, pauseTimer, resumeTimer, remainingMs, workedMin } from '../domain/timer'
import { formatDuration, nowISO, todayISO } from '../lib/dates'
import { newId } from '../lib/id'
import { applyReview } from '../domain/srs'
import type { FocusSession, ReviewRating } from '../domain/types'

const PRESETS = [
  { min: 25, label: '25 min', desc: 'Démarrage ou énergie basse' },
  { min: 50, label: '50 min', desc: 'Standard' },
  { min: 90, label: '90 min', desc: 'Profondeur' }
]

export function TimerStartSheet({ opts, onClose, onStarted }: {
  opts: TimerStartOpts
  onClose: () => void
  onStarted: () => void
}) {
  const { state, update } = useApp()
  const [minutes, setMinutes] = useState(opts.minutes ?? 25)
  const [custom, setCustom] = useState('')
  const [goal, setGoal] = useState('')
  const unit = opts.unitId ? state.studyUnits.find(u => u.id === opts.unitId) : null
  const task = opts.taskId ? state.tasks.find(t => t.id === opts.taskId) : null
  const label = opts.label ?? unit?.name ?? task?.title ?? 'Session libre'
  const [phoneAway, setPhoneAway] = useState(false)

  const start = () => {
    const min = custom ? Math.max(5, Math.min(180, parseInt(custom, 10) || 25)) : minutes
    const timer = startTimer({
      label, taskId: opts.taskId ?? null, unitId: opts.unitId ?? null,
      goal: goal.trim(), plannedMin: min
    })
    update(s => ({ ...s, activeTimer: timer }))
    onStarted()
  }

  return (
    <Sheet title="Lancer une session" onClose={onClose}>
      <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {unit && <p style={{ color: 'var(--secondary-label)', fontSize: 14 }}>Chapitre lié — la révision sera enregistrée à la fin.</p>}

      <label className="field-label">Durée</label>
      <div className="segmented" role="group" aria-label="Durée">
        {PRESETS.map(p => (
          <button key={p.min} aria-pressed={minutes === p.min && !custom}
            onClick={() => { setMinutes(p.min); setCustom('') }}>
            {p.label}
          </button>
        ))}
      </div>
      <label className="field-label" htmlFor="timer-custom">Ou durée personnalisée (min)</label>
      <input id="timer-custom" className="field" type="number" inputMode="numeric" min={5} max={180}
        value={custom} onChange={e => setCustom(e.target.value)} placeholder="ex. 40" />

      <label className="field-label" htmlFor="timer-goal">Objectif précis (facultatif)</label>
      <input id="timer-goal" className="field" value={goal} onChange={e => setGoal(e.target.value)}
        placeholder="ex. Refaire les 3 QCM ratés du chapitre" />

      <button className="list-row" style={{ marginTop: 16, borderRadius: 12, background: 'var(--tertiary-system-background)' }}
        onClick={() => setPhoneAway(!phoneAway)} aria-pressed={phoneAway}>
        <span className={`check-circle${phoneAway ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
        <span className="row-main"><span className="row-title">Téléphone hors de portée</span>
          <span className="row-sub">Pose-le dans une autre pièce avant de lancer</span></span>
      </button>

      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={start}>
        Commencer {custom ? `${Math.max(5, Math.min(180, parseInt(custom, 10) || 25))} min` : `${minutes} min`}
      </button>
    </Sheet>
  )
}

export function TimerScreen({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp()
  const timer = state.activeTimer
  const [, tick] = useState(0)
  const [ending, setEnding] = useState(false)
  const [interrupted, setInterrupted] = useState(false)

  useEffect(() => {
    const id = setInterval(() => tick(x => x + 1), 500)
    return () => clearInterval(id)
  }, [])

  const finished = timer ? remainingMs(timer) <= 0 : false

  useEffect(() => {
    if (finished && !ending) setEnding(true)
  }, [finished, ending])

  if (!timer) { return <EndSessionFallback onClose={onClose} /> }

  if (ending || finished) {
    return <EndSessionSheet onClose={onClose} onResume={!finished ? () => setEnding(false) : undefined} />
  }

  const rem = Math.max(0, remainingMs(timer))
  const paused = !!timer.pausedAt

  return (
    <div className="sos-screen" role="dialog" aria-modal="true" aria-label="Session de focus">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-plain" onClick={onClose}>Réduire</button>
        <button className="btn-plain" style={{ color: 'var(--danger)' }} onClick={() => setEnding(true)}>Terminer</button>
      </div>
      <div className="timer-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 600 }}>{timer.label}</p>
        {timer.goal && <p className="timer-goal">{timer.goal}</p>}
        <div className="timer-big" role="timer" aria-live="off">{formatDuration(rem)}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn btn-secondary btn-large" style={{ minWidth: 130 }}
            onClick={() => update(s => s.activeTimer ? { ...s, activeTimer: paused ? resumeTimer(s.activeTimer) : pauseTimer(s.activeTimer) } : s)}
          >
            <Icon name={paused ? 'play' : 'pause'} size={18} /> {paused ? 'Reprendre' : 'Pause'}
          </button>
        </div>
        {paused && <p style={{ color: 'var(--secondary-label)', marginTop: 12 }}>En pause — le temps ne s'écoule pas.</p>}
        <button className="btn-plain" style={{ marginTop: 32 }} onClick={() => setInterrupted(true)}>
          J'ai été interrompu
        </button>
      </div>
      {interrupted && (
        <InterruptionSheet onClose={() => setInterrupted(false)} onStop={() => { setInterrupted(false); setEnding(true) }} />
      )}
    </div>
  )
}

function InterruptionSheet({ onClose, onStop }: { onClose: () => void; onStop: () => void }) {
  const { update, toast } = useApp()
  const [distraction, setDistraction] = useState('')
  const note = () => {
    update(s => {
      let next = s
      if (s.activeTimer) next = { ...s, activeTimer: { ...s.activeTimer, interruptions: s.activeTimer.interruptions + 1 } }
      if (distraction.trim()) {
        next = {
          ...next,
          captures: [...next.captures, { id: newId('cap'), text: distraction.trim(), kind: null, createdAt: nowISO(), processedAt: null }]
        }
      }
      return next
    })
    if (distraction.trim()) toast('Distraction envoyée dans l\'Inbox.')
    onClose()
  }
  return (
    <Sheet title="Interruption" onClose={onClose}>
      <label className="field-label" htmlFor="intr-text">Une pensée ou distraction à noter ? (part dans l'Inbox)</label>
      <input id="intr-text" className="field" value={distraction} onChange={e => setDistraction(e.target.value)}
        placeholder="ex. Répondre à Théo" />
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button className="btn btn-primary btn-block" onClick={note}>Reprendre</button>
        <button className="btn btn-secondary btn-block" onClick={onStop}>Arrêter la session</button>
      </div>
    </Sheet>
  )
}

function EndSessionFallback({ onClose }: { onClose: () => void }) {
  useEffect(() => { onClose() }, [onClose])
  return null
}

export function EndSessionSheet({ onClose, onResume }: { onClose: () => void; onResume?: () => void }) {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const timer = state.activeTimer
  const [outcome, setOutcome] = useState<FocusSession['outcome']>('termine')
  const [quality, setQuality] = useState(3)
  const [proof, setProof] = useState('')
  const [rating, setRating] = useState<ReviewRating | null>(null)
  const today = todayISO(state.profile.timezone)

  const unit = timer?.unitId ? state.studyUnits.find(u => u.id === timer.unitId) : null
  const plan = unit ? state.reviewPlans.find(p => p.unitId === unit.id && p.active) : null

  const finish = () => {
    if (!timer) { onClose(); return }
    const session: FocusSession = {
      id: newId('focus'), label: timer.label, taskId: timer.taskId, unitId: timer.unitId,
      goal: timer.goal, plannedMin: timer.plannedMin,
      startedAt: timer.startedAt, endedAt: nowISO(),
      outcome, focusQuality: quality, proof: proof.trim(),
      interruptions: timer.interruptions, createdAt: nowISO()
    }
    update(s => {
      let next = { ...s, activeTimer: null as null, focusSessions: [...s.focusSessions, session] }
      if (plan && rating) {
        const out = applyReview(plan, rating, today)
        next = {
          ...next,
          reviewPlans: next.reviewPlans.map(p => p.id === plan.id
            ? { ...p, stage: out.stage, intervalDays: out.intervalDays, nextDue: out.nextDue }
            : p),
          reviewLogs: [...next.reviewLogs, {
            id: newId('rl'), planId: plan.id, unitId: plan.unitId, date: today, rating, createdAt: nowISO()
          }]
        }
      }
      return next
    })
    if (plan && rating) {
      const out = applyReview(plan, rating, today)
      toast(`Session enregistrée. Prochaine révision : dans ${out.intervalDays} j.`)
    } else {
      toast(`Session enregistrée (${workedMin(timer)} min travaillées).`)
    }
    onClose()
  }

  if (!timer) { onClose(); return null }

  return (
    <Sheet title="Fin de session" onClose={finish} closeLabel="Enregistrer">
      <p style={{ fontWeight: 600, fontSize: 17 }}>{timer.label}</p>
      <p style={{ color: 'var(--secondary-label)', fontSize: 14, marginBottom: 8 }}>
        {workedMin(timer)} min travaillées{timer.interruptions > 0 ? ` · ${timer.interruptions} interruption${timer.interruptions > 1 ? 's' : ''}` : ''}
      </p>

      <label className="field-label">Résultat</label>
      <Segmented label="Résultat" value={outcome} onChange={v => setOutcome(v)}
        options={[{ value: 'termine', label: 'Terminé' }, { value: 'partiel', label: 'Partiel' }, { value: 'abandonne', label: 'Abandonné' }]} />

      <label className="field-label" htmlFor="end-quality">Qualité du focus : {quality}/5</label>
      <input id="end-quality" type="range" min={1} max={5} value={quality}
        onChange={e => setQuality(Number(e.target.value))} aria-valuetext={`${quality} sur 5`} />

      {plan && (
        <>
          <label className="field-label">Rappel du chapitre — comment c'était ?</label>
          <Segmented label="Difficulté du rappel" value={rating} onChange={setRating}
            options={[
              { value: 'oublie', label: 'Oublié' },
              { value: 'difficile', label: 'Difficile' },
              { value: 'moyen', label: 'Moyen' },
              { value: 'facile', label: 'Facile' }
            ]} />
        </>
      )}

      <label className="field-label" htmlFor="end-proof">Preuve de travail — une seule chose</label>
      <textarea id="end-proof" className="field" rows={2} value={proof} onChange={e => setProof(e.target.value)}
        placeholder="Ce que je sais maintenant, une erreur corrigée, ou une question restante" />

      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={finish}>
        Enregistrer
      </button>
      {onResume && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={onResume}>
          Non, reprendre la session
        </button>
      )}
      <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={() => {
        finish(); ui.openTimerStart({ minutes: 25 })
      }}>
        Enregistrer et relancer une session
      </button>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 16 }}>
        Pause utile : eau, quelques pas, respiration, repos calme — pas d'écran court.
      </p>
    </Sheet>
  )
}
