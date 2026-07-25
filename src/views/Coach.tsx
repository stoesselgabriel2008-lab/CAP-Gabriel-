// Coach : Contrôle & SOS, Sommeil, Mental, Corps, Social.
// Le besoin recommandé d'abord, les autres domaines ensuite.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { currentStreak, bestStreak, alignedDaysLast30, afterLapse } from '../domain/streak'
import { todayCheckIn } from '../domain/recommend'
import { todayISO, formatCivilShort, localHour, nowISO } from '../lib/dates'
import { newId } from '../lib/id'
import type { IfThenPlan, SleepLog } from '../domain/types'

export function Coach() {
  const ui = useUi()
  const sub = ui.sub.coach ?? null
  if (sub === 'control') return <ControlView />
  if (sub === 'sleep') return <SleepView />
  if (sub === 'mental') return <MentalView />
  if (sub === 'body') return <BodyView />
  if (sub === 'social') return <SocialView />
  return <CoachHome />
}

function CoachHome() {
  const { state } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const checkIn = todayCheckIn(state, today)
  const hour = localHour(state.profile.timezone)

  // besoin recommandé : simple et explicable
  const recommended = useMemo(() => {
    if (checkIn && checkIn.urge >= 6) return { id: 'control', why: `Envie à ${checkIn.urge}/10 au check-in` }
    if (hour >= 21) return { id: 'sleep', why: 'C\'est le soir — le sommeil prépare demain' }
    if (checkIn && checkIn.stress === 'haut') return { id: 'mental', why: 'Stress haut au check-in' }
    if (checkIn && checkIn.sleepFelt === 'mauvais') return { id: 'sleep', why: 'Sommeil ressenti mauvais' }
    return { id: 'control', why: 'Ton engagement du moment' }
  }, [checkIn, hour])

  const domains = [
    { id: 'control', icon: 'sos', title: 'Contrôle', sub: 'Engagement, SOS, déclencheurs, plans si… alors' },
    { id: 'sleep', icon: 'moon', title: 'Sommeil', sub: 'Journal, fermeture du soir, protocole d\'endormissement' },
    { id: 'mental', icon: 'mind', title: 'Mental', sub: 'Reset rapide, journal, aide à la décision' },
    { id: 'body', icon: 'body', title: 'Corps', sub: 'Séances, effort, récupération' },
    { id: 'social', icon: 'social', title: 'Social', sub: 'Échelle graduelle d\'exercices réels' }
  ]
  const first = domains.find(d => d.id === recommended.id)!
  const rest = domains.filter(d => d.id !== recommended.id)

  return (
    <div className="screen">
      <h1 className="large-title">Coach</h1>
      <p className="subtitle-context">De quel soutien as-tu besoin maintenant ?</p>

      <div className="now-card">
        <div className="now-kicker">Recommandé</div>
        <div className="now-title">{first.title}</div>
        <div className="now-sub">{recommended.why}</div>
        <button className="btn btn-primary btn-block btn-large" onClick={() => ui.setSub('coach', first.id)}>
          Ouvrir
        </button>
      </div>

      <div className="list-group">
        {rest.map(d => (
          <button key={d.id} className="list-row" onClick={() => ui.setSub('coach', d.id)}>
            <Icon name={d.icon} size={22} className="chevron" />
            <span className="row-main">
              <span className="row-title">{d.title}</span>
              <span className="row-sub">{d.sub}</span>
            </span>
            <Icon name="chevronRight" size={16} className="chevron" />
          </button>
        ))}
      </div>

      <button className="btn btn-danger btn-block btn-large" style={{ marginTop: 8 }} onClick={ui.openSOS}>
        SOS — traverser une envie
      </button>
    </div>
  )
}

/* ─── Contrôle ─────────────────────────────────────────────────────── */

const ENV_CHECKLIST = [
  'Téléphone à charger hors de la chambre (ou loin du lit)',
  'Filtres de contenu activés (Temps d\'écran → Restrictions)',
  'Limites d\'apps réglées dans Temps d\'écran',
  'Routine du soir en place',
  'Une activité de remplacement prête (marche, douche, lecture)'
]

function ControlView() {
  const { state, update, updateUndoable, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const streak = currentStreak(state.commitment, today)
  const best = bestStreak(state.commitment, today)
  const aligned = alignedDaysLast30(state.lapseEvents, today)
  const [lapseFlow, setLapseFlow] = useState(false)
  const [newPlan, setNewPlan] = useState(false)
  const recentUrges = state.urgeEvents.slice(-5).reverse()

  return (
    <div className="screen">
      <BackHeader title="Contrôle" onBack={() => ui.setSub('coach', null)} />

      <div className="card" style={{ textAlign: 'center', padding: '28px 16px' }}>
        <p style={{ fontSize: 15, color: 'var(--secondary-label)' }}>Engagement tenu depuis</p>
        <p style={{ fontSize: 52, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {streak} <span style={{ fontSize: 22, fontWeight: 500 }}>jour{streak !== 1 ? 's' : ''}</span>
        </p>
        <p style={{ fontSize: 14, color: 'var(--secondary-label)', marginTop: 8 }}>
          Départ {formatCivilShort(state.commitment.startDate)} · record {best} j · {aligned}/30 derniers jours alignés
        </p>
        <p style={{ fontSize: 13, color: 'var(--tertiary-label)', marginTop: 12 }}>
          Le compteur est un repère, pas la seule mesure. Ce que tu apprends sur tes déclencheurs compte plus.
        </p>
      </div>

      <button className="btn btn-danger btn-block btn-large" onClick={ui.openSOS}>
        SOS — une envie monte
      </button>

      {/* Plans si… alors */}
      <SectionHeader action="Nouveau" onAction={() => setNewPlan(true)}>Plans « si… alors… »</SectionHeader>
      {state.ifThenPlans.length === 0 ? (
        <div className="card">
          <EmptyState title="Aucun plan">
            Un plan « si… alors… » décide à l'avance ta réponse à un déclencheur.
            Exemple : « Si je prends mon téléphone au lit, alors je le pose à charger hors de portée. »
          </EmptyState>
        </div>
      ) : (
        <div className="list-group">
          {state.ifThenPlans.map(p => (
            <div key={p.id} className="list-row">
              <span className="row-main">
                <span className="row-title" style={{ whiteSpace: 'normal', fontSize: 15 }}>
                  <strong>Si</strong> {p.ifPart}, <strong>alors</strong> {p.thenPart}
                </span>
              </span>
              <button aria-label="Supprimer ce plan" style={{ minHeight: 44, minWidth: 44, color: 'var(--secondary-label)' }}
                onClick={() => updateUndoable('Plan supprimé.', s => ({ ...s, ifThenPlans: s.ifThenPlans.filter(x => x.id !== p.id) }))}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friction environnementale */}
      <SectionHeader>Friction utile</SectionHeader>
      <div className="card">
        <ul style={{ paddingLeft: 20, color: 'var(--secondary-label)', lineHeight: 1.8, fontSize: 15 }}>
          {ENV_CHECKLIST.map(c => <li key={c}>{c}</li>)}
        </ul>
        <p style={{ fontSize: 13, color: 'var(--tertiary-label)', marginTop: 10 }}>
          Cap ne peut pas bloquer d'autres apps — c'est une limite technique des web apps.
          Les réglages Temps d'écran d'iOS le font très bien (Réglages → Temps d'écran).
        </p>
      </div>

      {/* Dernières envies */}
      {recentUrges.length > 0 && (
        <>
          <SectionHeader>Dernières envies traversées</SectionHeader>
          <div className="list-group">
            {recentUrges.map(u => (
              <div key={u.id} className="list-row">
                <span className="row-main">
                  <span className="row-title" style={{ fontSize: 15 }}>
                    {u.trigger || u.emotion || 'Envie'} · {u.intensityBefore}/10
                    {u.intensityAfter != null && ` → ${u.intensityAfter}/10`}
                  </span>
                  <span className="row-sub">{u.at.slice(0, 10)}{u.helped && ` · a aidé : ${u.helped}`}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Déclarer un écart */}
      <SectionHeader>Honnêteté</SectionHeader>
      <button className="btn btn-secondary btn-block" onClick={() => setLapseFlow(true)}>
        Déclarer un écart
      </button>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '8px 4px 0', textAlign: 'center' }}>
        Un écart ne supprime pas ce que tu as appris.
      </p>

      {newPlan && <IfThenEditor onClose={() => setNewPlan(false)} />}
      {lapseFlow && <LapseFlow onClose={() => setLapseFlow(false)} />}
    </div>
  )
}

function IfThenEditor({ onClose }: { onClose: () => void }) {
  const { update, toast } = useApp()
  const [ifPart, setIfPart] = useState('')
  const [thenPart, setThenPart] = useState('')
  const save = () => {
    if (!ifPart.trim() || !thenPart.trim()) { toast('Remplis les deux parties.'); return }
    update(s => ({
      ...s,
      ifThenPlans: [...s.ifThenPlans, { id: newId('ift'), ifPart: ifPart.trim(), thenPart: thenPart.trim(), createdAt: nowISO() }]
    }))
    onClose()
  }
  return (
    <Sheet title="Plan « si… alors… »" onClose={onClose}>
      <label className="field-label" htmlFor="ift-if">Si…</label>
      <input id="ift-if" className="field" value={ifPart} onChange={e => setIfPart(e.target.value)} autoFocus
        placeholder="je suis seul et stressé le soir" />
      <label className="field-label" htmlFor="ift-then">Alors…</label>
      <input id="ift-then" className="field" value={thenPart} onChange={e => setThenPart(e.target.value)}
        placeholder="je prends une douche puis je prépare demain" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}

const LAPSE_CONTEXTS = ['Ennui', 'Stress', 'Fatigue', 'Solitude', 'Téléphone au lit', 'Contenu déclencheur', 'Douche', 'Chambre', 'Frustration', 'Habitude automatique', 'Autre']

function LapseFlow({ onClose }: { onClose: () => void }) {
  const { state, updateUndoable } = useApp()
  const today = todayISO(state.profile.timezone)
  const [step, setStep] = useState(0)
  const [contexts, setContexts] = useState<string[]>([])
  const [lesson, setLesson] = useState('')
  const [action, setAction] = useState('')
  const streak = currentStreak(state.commitment, today)

  const confirm = () => {
    updateUndoable('Écart enregistré — la série repart de zéro.', s => ({
      ...s,
      commitment: afterLapse(s.commitment, today),
      lapseEvents: [...s.lapseEvents, {
        id: newId('lapse'), at: nowISO(), date: today,
        context: contexts, lesson: lesson.trim(), protectiveAction: action.trim(),
        previousStreak: streak
      }]
    }))
    onClose()
  }

  const steps = [
    <div key="0">
      <p style={{ fontSize: 17, lineHeight: 1.5 }}>
        Tu veux déclarer un écart ? La série actuelle ({streak} j) repartira de zéro,
        mais ton record et tout ce que tu as appris restent.
      </p>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={() => setStep(1)}>Oui, continuer</button>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={onClose}>Non, revenir</button>
    </div>,
    <div key="1">
      <span className="field-label">Le contexte (quelques taps suffisent)</span>
      <div className="chip-row">
        {LAPSE_CONTEXTS.map(c => (
          <button key={c} type="button" className="chip" aria-pressed={contexts.includes(c)}
            onClick={() => setContexts(x => x.includes(c) ? x.filter(y => y !== c) : [...x, c])}>
            {c}
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={() => setStep(2)}>Continuer</button>
    </div>,
    <div key="2">
      <label className="field-label" htmlFor="lp-lesson">Une seule leçon</label>
      <input id="lp-lesson" className="field" value={lesson} onChange={e => setLesson(e.target.value)}
        placeholder="Qu'est-ce qui rendra le prochain moment plus facile ?" />
      <label className="field-label" htmlFor="lp-action">Une action protectrice</label>
      <input id="lp-action" className="field" value={action} onChange={e => setAction(e.target.value)}
        placeholder="ex. Téléphone hors de la chambre dès ce soir" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={confirm}>
        Enregistrer et repartir
      </button>
    </div>
  ]

  return (
    <Sheet title="Déclarer un écart" onClose={onClose}>
      {steps[step]}
    </Sheet>
  )
}

/* ─── Sommeil ──────────────────────────────────────────────────────── */

function SleepView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [logOpen, setLogOpen] = useState(false)
  const [protocolOpen, setProtocolOpen] = useState(false)
  const recent = state.sleepLogs.slice(-7).reverse()

  return (
    <div className="screen">
      <BackHeader title="Sommeil" onBack={() => ui.setSub('coach', null)} />
      <p className="subtitle-context">Stabiliser le sommeil, sans obsession des chiffres.</p>

      <div className="list-group">
        <button className="list-row" onClick={() => setLogOpen(true)}>
          <Icon name="moon" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Journal de la nuit dernière</span>
            <span className="row-sub">30 secondes, tout est facultatif</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={ui.openEvening}>
          <Icon name="timer" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Fermeture du soir</span>
            <span className="row-sub">Vider la tête, préparer demain, poser le téléphone</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => setProtocolOpen(true)}>
          <Icon name="info" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">« Je n'arrive pas à dormir »</span>
            <span className="row-sub">Protocole simple pour les nuits difficiles</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>

      <SectionHeader>Les bases qui marchent</SectionHeader>
      <div className="card">
        <ul style={{ paddingLeft: 20, color: 'var(--secondary-label)', lineHeight: 1.8, fontSize: 15 }}>
          <li>Heure de lever stable ({state.profile.wakeTarget}), même le week-end</li>
          <li>Lumière naturelle le matin</li>
          <li>Caféine avant 14 h</li>
          <li>Téléphone hors du lit</li>
          <li>Aller au lit avec de la somnolence, pas par obligation d'horaire</li>
          <li>Chambre sombre, calme et fraîche</li>
        </ul>
      </div>

      {recent.length > 0 && (
        <>
          <SectionHeader>Dernières nuits</SectionHeader>
          <div className="list-group">
            {recent.map(l => (
              <div key={l.id} className="list-row">
                <span className="row-main">
                  <span className="row-title" style={{ fontSize: 15 }}>{l.date}</span>
                  <span className="row-sub">
                    {l.bedTime && `couché ${l.bedTime}`}{l.wakeTime && ` · levé ${l.wakeTime}`}
                    {l.screenInBed === true && ' · écran au lit'}
                  </span>
                </span>
                {l.quality && <span className="row-detail">{{ mauvais: 'Mauvais', moyen: 'Moyen', bon: 'Bon' }[l.quality]}</span>}
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '4px 4px 0' }}>
            Regarde des tendances sur 7 à 14 jours. Association, pas causalité — une seule nuit ne dit rien.
          </p>
        </>
      )}

      {logOpen && <SleepLogSheet onClose={() => setLogOpen(false)} />}
      {protocolOpen && <CantSleepSheet onClose={() => setProtocolOpen(false)} />}
    </div>
  )
}

function SleepLogSheet({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [bedTime, setBedTime] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [quality, setQuality] = useState<SleepLog['quality']>(null)
  const [screenInBed, setScreenInBed] = useState<boolean | null>(null)
  const [lateCaffeine, setLateCaffeine] = useState<boolean | null>(null)

  const save = () => {
    update(s => ({
      ...s,
      sleepLogs: [...s.sleepLogs.filter(l => l.date !== today), {
        id: newId('sleep'), date: today,
        bedTime: bedTime || null, sleepLatencyMin: null, wakeTime: wakeTime || null,
        quality, screenInBed, lateCaffeine, morningLight: null, note: ''
      }]
    }))
    toast('Nuit enregistrée.')
    onClose()
  }

  return (
    <Sheet title="Nuit dernière" onClose={onClose}>
      <label className="field-label" htmlFor="sl-bed">Heure au lit</label>
      <input id="sl-bed" className="field" type="time" value={bedTime} onChange={e => setBedTime(e.target.value)} />
      <label className="field-label" htmlFor="sl-wake">Heure de lever</label>
      <input id="sl-wake" className="field" type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
      <label className="field-label">Qualité ressentie</label>
      <Segmented label="Qualité" value={quality} onChange={setQuality}
        options={[{ value: 'mauvais', label: 'Mauvais' }, { value: 'moyen', label: 'Moyen' }, { value: 'bon', label: 'Bon' }]} />
      <label className="field-label">Écran dans le lit ?</label>
      <Segmented label="Écran dans le lit" value={screenInBed === null ? null : screenInBed ? 'oui' : 'non'}
        onChange={v => setScreenInBed(v === 'oui')}
        options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }]} />
      <label className="field-label">Caféine après 14 h ?</label>
      <Segmented label="Caféine tardive" value={lateCaffeine === null ? null : lateCaffeine ? 'oui' : 'non'}
        onChange={v => setLateCaffeine(v === 'oui')}
        options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }]} />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}

function CantSleepSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Je n'arrive pas à dormir" onClose={onClose}>
      <ol style={{ paddingLeft: 22, lineHeight: 1.9, fontSize: 16 }}>
        <li>Ne regarde pas l'heure.</li>
        <li>Expire lentement, plus longtemps que l'inspiration.</li>
        <li>Relâche la mâchoire et les épaules.</li>
        <li>Si tu es clairement éveillé et frustré : sors du lit, lumière faible.</li>
        <li>Fais une activité monotone (lecture ennuyeuse, rangement calme).</li>
        <li>Retourne au lit seulement avec de la somnolence.</li>
      </ol>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
        Rester au lit frustré associe le lit à l'éveil. En sortir brièvement casse cette association.
        Si l'insomnie est fréquente et pèse sur tes journées, parles-en à un professionnel de santé.
      </p>
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={onClose}>OK</button>
    </Sheet>
  )
}

/* ─── Mental ───────────────────────────────────────────────────────── */

function MentalView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [journalOpen, setJournalOpen] = useState(false)
  const [breathing, setBreathing] = useState(false)
  const recent = state.journalEntries.filter(j => !j.text.startsWith('[fermeture]')).slice(-5).reverse()

  return (
    <div className="screen">
      <BackHeader title="Mental" onBack={() => ui.setSub('coach', null)} />
      <p className="subtitle-context">Réguler, décharger, décider. Pas une thérapie — un kit de premiers gestes.</p>

      <SectionHeader>Reset rapide</SectionHeader>
      <div className="list-group">
        <button className="list-row" onClick={() => setBreathing(true)}>
          <Icon name="wave" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Respiration — 1 minute</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => setJournalOpen(true)}>
          <Icon name="capture" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Décharger une pensée</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => { ui.openCapture() }}>
          <Icon name="check" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Choisir la prochaine petite action</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>

      {recent.length > 0 && (
        <>
          <SectionHeader>Journal récent</SectionHeader>
          <div className="list-group">
            {recent.map(j => (
              <div key={j.id} className="list-row">
                <span className="row-main">
                  <span className="row-title" style={{ fontSize: 15, whiteSpace: 'normal' }}>
                    {state.settings.hideSensitivePreviews ? '••• (aperçu masqué)' : j.text.slice(0, 120)}
                  </span>
                  <span className="row-sub">{j.date}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {journalOpen && <JournalSheet onClose={() => setJournalOpen(false)} />}
      {breathing && <BreathSheet onClose={() => setBreathing(false)} />}
    </div>
  )
}

function JournalSheet({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [format, setFormat] = useState<'phrase' | 'vdl' | 'libre'>('phrase')
  const [text, setText] = useState('')

  const save = () => {
    if (!text.trim()) return
    update(s => ({
      ...s,
      journalEntries: [...s.journalEntries, { id: newId('j'), date: today, format, text: text.trim(), createdAt: nowISO() }]
    }))
    toast('Enregistré.')
    onClose()
  }

  return (
    <Sheet title="Journal" onClose={onClose}>
      <Segmented label="Format" value={format} onChange={setFormat}
        options={[{ value: 'phrase', label: 'Une phrase' }, { value: 'vdl', label: 'Victoire · difficulté · leçon' }, { value: 'libre', label: 'Libre' }]} />
      <textarea className="field" rows={format === 'phrase' ? 2 : 5} style={{ marginTop: 12 }} autoFocus
        value={text} onChange={e => setText(e.target.value)}
        placeholder={format === 'vdl' ? 'Victoire :\nDifficulté :\nLeçon :' : 'Écris librement — rien n\'est obligatoire'}
        aria-label="Texte du journal" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} disabled={!text.trim()} onClick={save}>
        Enregistrer
      </button>
    </Sheet>
  )
}

function BreathSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Respiration" onClose={onClose}>
      <p style={{ color: 'var(--secondary-label)', textAlign: 'center' }}>
        Inspire avec le cercle qui grandit, expire quand il rétrécit. Une minute suffit souvent.
      </p>
      <div className="breath-circle" aria-hidden="true" />
      <button className="btn btn-primary btn-block btn-large" onClick={onClose}>Terminer</button>
    </Sheet>
  )
}

/* ─── Corps ────────────────────────────────────────────────────────── */

function BodyView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [effort, setEffort] = useState(5)
  const recent = state.bodyLogs.slice(-7).reverse()

  const save = () => {
    if (!type.trim()) { toast('Indique le type de séance.'); return }
    update(s => ({
      ...s,
      bodyLogs: [...s.bodyLogs, {
        id: newId('body'), date: today, type: type.trim(),
        durationMin: duration ? parseInt(duration, 10) || null : null,
        effort, pain: '', note: ''
      }]
    }))
    setType(''); setDuration('')
    toast('Séance enregistrée.')
  }

  return (
    <div className="screen">
      <BackHeader title="Corps" onBack={() => ui.setSub('coach', null)} />
      <p className="subtitle-context">Bouger aide le sommeil, l'humeur et le focus. Simple et léger.</p>
      <div className="card">
        <label className="field-label" htmlFor="bd-type" style={{ marginTop: 0 }}>Séance</label>
        <input id="bd-type" className="field" value={type} onChange={e => setType(e.target.value)}
          placeholder="ex. Marche, muscu, foot" />
        <label className="field-label" htmlFor="bd-dur">Durée (min)</label>
        <input id="bd-dur" className="field" type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)} />
        <label className="field-label" htmlFor="bd-eff">Effort perçu : {effort}/10</label>
        <input id="bd-eff" type="range" min={1} max={10} value={effort} onChange={e => setEffort(Number(e.target.value))}
          aria-valuetext={`${effort} sur 10`} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      </div>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '4px 4px 12px' }}>
        Douleur inhabituelle ou signe inquiétant : c'est un motif de consultation, pas un truc à « pousser ».
      </p>
      {recent.length > 0 && (
        <div className="list-group">
          {recent.map(l => (
            <div key={l.id} className="list-row">
              <span className="row-main"><span className="row-title" style={{ fontSize: 15 }}>{l.type}</span>
                <span className="row-sub">{l.date}</span></span>
              <span className="row-detail">{l.durationMin ? `${l.durationMin} min · ` : ''}effort {l.effort}/10</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Social ───────────────────────────────────────────────────────── */

const SOCIAL_LADDER = [
  'Regarder et sourire',
  'Dire bonjour',
  'Poser une question simple',
  'Faire un commentaire contextuel',
  'Tenir une conversation de deux minutes',
  'Relancer une conversation',
  'Proposer une activité'
]

function SocialView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [logFor, setLogFor] = useState<number | null>(null)
  const attempts = state.socialExercises

  // niveau suggéré : le plus haut niveau tenté +0, ou 1
  const maxDone = attempts.length ? Math.max(...attempts.map(a => a.level)) : 0
  const suggested = Math.min(7, maxDone + 1)

  return (
    <div className="screen">
      <BackHeader title="Social" onBack={() => ui.setSub('coach', null)} />
      <p className="subtitle-context">
        L'aisance vient d'interactions réelles, graduelles et répétées — pas d'un compteur.
        On mesure les essais, jamais la « validation ».
      </p>
      <div className="list-group">
        {SOCIAL_LADDER.map((label, i) => {
          const level = i + 1
          const count = attempts.filter(a => a.level === level).length
          return (
            <button key={level} className="list-row" onClick={() => setLogFor(level)}>
              <span className="badge-count" style={level === suggested ? { background: 'var(--tint)', color: '#fff' } : {}}>{level}</span>
              <span className="row-main">
                <span className="row-title">{label}</span>
                <span className="row-sub">
                  {count > 0 ? `${count} essai${count > 1 ? 's' : ''}` : 'Pas encore essayé'}
                  {level === suggested && ' · suggéré'}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className="chevron" />
            </button>
          )
        })}
      </div>
      {logFor !== null && <SocialLogSheet level={logFor} onClose={() => setLogFor(null)} />}
    </div>
  )
}

function SocialLogSheet({ level, onClose }: { level: number; onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [before, setBefore] = useState(5)
  const [after, setAfter] = useState(3)
  const [learned, setLearned] = useState('')

  const save = () => {
    update(s => ({
      ...s,
      socialExercises: [...s.socialExercises, {
        id: newId('soc'), date: today, level,
        anxietyBefore: before, anxietyAfter: after, learned: learned.trim(), createdAt: nowISO()
      }]
    }))
    toast('Essai enregistré. C\'est la répétition qui compte.')
    onClose()
  }

  return (
    <Sheet title={`Essai — ${SOCIAL_LADDER[level - 1]}`} onClose={onClose}>
      <label className="field-label" htmlFor="so-before">Anxiété avant : {before}/10</label>
      <input id="so-before" type="range" min={0} max={10} value={before} onChange={e => setBefore(Number(e.target.value))}
        aria-valuetext={`${before} sur 10`} />
      <label className="field-label" htmlFor="so-after">Anxiété après : {after}/10</label>
      <input id="so-after" type="range" min={0} max={10} value={after} onChange={e => setAfter(Number(e.target.value))}
        aria-valuetext={`${after} sur 10`} />
      <label className="field-label" htmlFor="so-learned">Ce que tu as appris (facultatif)</label>
      <input id="so-learned" className="field" value={learned} onChange={e => setLearned(e.target.value)}
        placeholder="ex. L'anxiété redescend vite une fois lancé" />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer l'essai</button>
    </Sheet>
  )
}
