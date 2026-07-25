// Réviser : file due, matières, chapitres, plans Méthode des J,
// journal d'erreurs, compagnon Anki, protocoles de session.

import React, { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { computeDueQueue, todayCheckIn } from '../domain/recommend'
import { createPlan, J_SEQUENCE } from '../domain/srs'
import { todayISO, addDays, relativeLabel, nowISO, daysBetween } from '../lib/dates'
import { newId } from '../lib/id'
import type { Subject, StudyUnit, ErrorLog, UnitKind } from '../domain/types'

const KIND_LABELS: Record<UnitKind, string> = {
  factuel: 'Factuel', conceptuel: 'Conceptuel', procedural: 'Procédural / maths',
  spatial: 'Spatial / anatomie', demonstratif: 'Démonstratif'
}

const KIND_METHODS: Record<UnitKind, string[]> = {
  factuel: ['Rappel actif : questions-réponses sans support', 'Feedback immédiat sur chaque réponse', 'Espacement (le plan J s\'en charge)'],
  conceptuel: ['Expliquer le concept sans support, à voix haute ou par écrit', 'Questions pourquoi / comment', 'Trouver un exemple et un contre-exemple'],
  procedural: ['Refaire un exemple travaillé, puis masquer une étape', 'Problème isomorphe (mêmes étapes, autres valeurs)', 'Noter chaque erreur dans le journal d\'erreurs'],
  spatial: ['Schéma vierge : redessiner ou étiqueter de mémoire', 'Verbaliser les relations spatiales (au-dessus, en dedans…)', 'Comparer au support, corriger, recommencer'],
  demonstratif: ['Restituer la stratégie générale avant les détails', 'Identifier les transitions clés de la démonstration', 'Reconstruire sans regarder, comparer']
}

export function Review() {
  const ui = useUi()
  const sub = ui.sub.review ?? null
  if (sub === 'errors') return <ErrorJournal />
  if (sub === 'anki') return <AnkiCompanion />
  if (sub?.startsWith('subject:')) return <SubjectDetail subjectId={sub.slice(8)} />
  return <ReviewHome />
}

function ReviewHome() {
  const { state, update } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const due = useMemo(() => computeDueQueue(state, today), [state, today])
  const checkIn = todayCheckIn(state, today)
  const lowEnergy = checkIn?.energy === 'basse'
  const [newSubject, setNewSubject] = useState(false)
  const untested = state.errorLogs.filter(e => !e.retested).length

  return (
    <div className="screen">
      <h1 className="large-title">Réviser</h1>
      <p className="subtitle-context">
        {due.length > 0
          ? `${due.length} révision${due.length > 1 ? 's' : ''} due${due.length > 1 ? 's' : ''}${lowEnergy ? ' · énergie basse : sessions courtes conseillées' : ''}`
          : "Rien n'est dû aujourd'hui. Tu peux avancer un chapitre ou t'arrêter là."}
      </p>

      {/* File due */}
      {due.length > 0 && (
        <>
          <SectionHeader>À revoir</SectionHeader>
          <div className="list-group">
            {due.slice(0, 6).map(item => {
              const unit = state.studyUnits.find(u => u.id === item.plan.unitId)
              if (!unit) return null
              const subj = state.subjects.find(s => s.id === unit.subjectId)
              return (
                <button key={item.plan.id} className="list-row"
                  onClick={() => ui.openTimerStart({ minutes: lowEnergy ? 25 : 25, unitId: unit.id })}>
                  <Icon name="book" size={20} className="chevron" />
                  <span className="row-main">
                    <span className="row-title">{unit.name}</span>
                    <span className="row-sub">{subj?.name} · {item.why}</span>
                  </span>
                  <span className="row-detail" style={{ color: 'var(--tint)' }}>25 min</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Sessions */}
      <SectionHeader>Sessions</SectionHeader>
      <div className="list-group">
        {[
          { min: 25, title: '25 min — démarrage ou énergie basse', sub: '2 min objectif · 17 min rappel actif · 4 min erreurs · 2 min suite' },
          { min: 50, title: '50 min — standard', sub: '5 min pré-test · 25 min pratique · pause · 10 min retest · 5 min bilan' },
          { min: 90, title: '90 min — profondeur', sub: 'préparation · 30 min guidé · pause sans écran · 30 min pratique · test' }
        ].map(p => (
          <button key={p.min} className="list-row" onClick={() => ui.openTimerStart({ minutes: p.min })}>
            <Icon name="timer" size={20} className="chevron" />
            <span className="row-main">
              <span className="row-title">{p.title}</span>
              <span className="row-sub">{p.sub}</span>
            </span>
            <Icon name="chevronRight" size={16} className="chevron" />
          </button>
        ))}
      </div>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '4px 4px 0' }}>
        Ces protocoles sont des points de départ modifiables, pas des règles absolues.
      </p>

      {/* Outils */}
      <SectionHeader>Outils</SectionHeader>
      <div className="list-group">
        <button className="list-row" onClick={() => ui.setSub('review', 'errors')}>
          <Icon name="flag" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Journal d'erreurs</span></span>
          {untested > 0 && <span className="badge-count">{untested}</span>}
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('review', 'anki')}>
          <Icon name="review" size={20} className="chevron" />
          <span className="row-main">
            <span className="row-title">Compagnon Anki</span>
            <span className="row-sub">Suivi de tes sessions de cartes — sans remplacer Anki</span>
          </span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>

      {/* Matières */}
      <SectionHeader action="Nouvelle" onAction={() => setNewSubject(true)}>Matières</SectionHeader>
      {state.subjects.length === 0 ? (
        <div className="card">
          <EmptyState title="Aucune matière">
            Crée une matière (ex. Anatomie), puis ses chapitres. Cap génèrera le plan de révision J0 · J1 · J3 · J7 · J14 · J30.
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setNewSubject(true)}>Créer une matière</button>
            </div>
          </EmptyState>
        </div>
      ) : (
        <div className="list-group">
          {state.subjects.map(s => {
            const units = state.studyUnits.filter(u => u.subjectId === s.id && !u.archived)
            const dueCount = due.filter(d => units.some(u => u.id === d.plan.unitId)).length
            return (
              <button key={s.id} className="list-row" onClick={() => ui.setSub('review', `subject:${s.id}`)}>
                <span className="row-main">
                  <span className="row-title">{s.name}</span>
                  <span className="row-sub">
                    {units.length} chapitre{units.length !== 1 ? 's' : ''}
                    {s.examDate && ` · examen ${relativeLabel(s.examDate, today)}`}
                  </span>
                </span>
                {dueCount > 0 && <span className="badge-count">{dueCount}</span>}
                <Icon name="chevronRight" size={16} className="chevron" />
              </button>
            )
          })}
        </div>
      )}

      {newSubject && <SubjectEditor subject={null} onClose={() => setNewSubject(false)} />}
    </div>
  )
}

function SubjectEditor({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const { update, toast } = useApp()
  const [name, setName] = useState(subject?.name ?? '')
  const [examDate, setExamDate] = useState(subject?.examDate ?? '')

  const save = () => {
    if (!name.trim()) { toast('Un nom est nécessaire.'); return }
    if (subject) {
      update(s => ({ ...s, subjects: s.subjects.map(x => x.id === subject.id ? { ...x, name: name.trim(), examDate: examDate || null } : x) }))
    } else {
      update(s => ({ ...s, subjects: [...s.subjects, { id: newId('subj'), name: name.trim(), examDate: examDate || null, createdAt: nowISO() }] }))
    }
    onClose()
  }

  return (
    <Sheet title={subject ? 'Matière' : 'Nouvelle matière'} onClose={onClose}>
      <label className="field-label" htmlFor="se-name">Nom</label>
      <input id="se-name" className="field" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="ex. Anatomie" />
      <label className="field-label" htmlFor="se-exam">Date d'examen (facultatif)</label>
      <input id="se-exam" className="field" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}

function SubjectDetail({ subjectId }: { subjectId: string }) {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const subject = state.subjects.find(s => s.id === subjectId)
  const [newUnit, setNewUnit] = useState(false)
  const [editSubject, setEditSubject] = useState(false)
  const [openUnit, setOpenUnit] = useState<StudyUnit | null>(null)

  if (!subject) {
    return (
      <div className="screen">
        <BackHeader title="Matière" onBack={() => ui.setSub('review', null)} />
        <EmptyState title="Matière introuvable">Elle a peut-être été supprimée.</EmptyState>
      </div>
    )
  }

  const units = state.studyUnits.filter(u => u.subjectId === subjectId && !u.archived)

  return (
    <div className="screen">
      <BackHeader title={subject.name} onBack={() => ui.setSub('review', null)} action="Modifier" onAction={() => setEditSubject(true)} />
      {subject.examDate && (
        <p className="subtitle-context">
          Examen {relativeLabel(subject.examDate, today)}
          {daysBetween(today, subject.examDate) >= 0 && ` (dans ${daysBetween(today, subject.examDate)} j)`}
        </p>
      )}
      <SectionHeader action="Nouveau chapitre" onAction={() => setNewUnit(true)}>Chapitres</SectionHeader>
      {units.length === 0 ? (
        <div className="card">
          <EmptyState title="Aucun chapitre">
            Ajoute un chapitre appris pour lancer son plan de révision.
          </EmptyState>
        </div>
      ) : (
        <div className="list-group">
          {units.map(u => {
            const plan = state.reviewPlans.find(p => p.unitId === u.id && p.active)
            return (
              <button key={u.id} className="list-row" onClick={() => setOpenUnit(u)}>
                <span className="row-main">
                  <span className="row-title">{u.name}</span>
                  <span className="row-sub">
                    {KIND_LABELS[u.kind]}
                    {plan ? ` · prochaine révision ${relativeLabel(plan.nextDue, today)}` : ' · pas de plan de révision'}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="chevron" />
              </button>
            )
          })}
        </div>
      )}
      {newUnit && <UnitEditor subjectId={subjectId} unit={null} onClose={() => setNewUnit(false)} />}
      {editSubject && <SubjectEditor subject={subject} onClose={() => setEditSubject(false)} />}
      {openUnit && <UnitSheet unit={openUnit} onClose={() => setOpenUnit(null)} />}
    </div>
  )
}

function UnitEditor({ subjectId, unit, onClose }: { subjectId: string; unit: StudyUnit | null; onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [name, setName] = useState(unit?.name ?? '')
  const [kind, setKind] = useState<UnitKind>(unit?.kind ?? 'factuel')
  const [source, setSource] = useState(unit?.source ?? '')
  const [withPlan, setWithPlan] = useState(true)

  const save = () => {
    if (!name.trim()) { toast('Un nom est nécessaire.'); return }
    if (unit) {
      update(s => ({ ...s, studyUnits: s.studyUnits.map(x => x.id === unit.id ? { ...x, name: name.trim(), kind, source: source.trim() } : x) }))
    } else {
      const newUnit: StudyUnit = {
        id: newId('unit'), subjectId, name: name.trim(), kind, mastery: 0,
        source: source.trim(), createdAt: nowISO(), archived: false
      }
      update(s => ({
        ...s,
        studyUnits: [...s.studyUnits, newUnit],
        reviewPlans: withPlan ? [...s.reviewPlans, createPlan(newUnit.id, today)] : s.reviewPlans
      }))
      if (withPlan) toast('Chapitre créé — plan J0 · J1 · J3 · J7 · J14 · J30 lancé.')
    }
    onClose()
  }

  return (
    <Sheet title={unit ? 'Chapitre' : 'Nouveau chapitre'} onClose={onClose}>
      <label className="field-label" htmlFor="ue-name">Nom du chapitre</label>
      <input id="ue-name" className="field" value={name} onChange={e => setName(e.target.value)} autoFocus
        placeholder="ex. Membre supérieur — ostéologie" />
      <label className="field-label">Type de contenu</label>
      <select className="field" value={kind} onChange={e => setKind(e.target.value as UnitKind)} aria-label="Type de contenu">
        {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="field-label" htmlFor="ue-source">Source ou lien (facultatif)</label>
      <input id="ue-source" className="field" value={source} onChange={e => setSource(e.target.value)}
        placeholder="ex. Cours du 12/09, page 34" />
      {!unit && (
        <button className="list-row" style={{ marginTop: 12, borderRadius: 12, background: 'var(--tertiary-system-background)' }}
          onClick={() => setWithPlan(!withPlan)} aria-pressed={withPlan}>
          <span className={`check-circle${withPlan ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
          <span className="row-main"><span className="row-title">Lancer le plan de révision</span>
            <span className="row-sub">J0 aujourd'hui, puis J1 · J3 · J7 · J14 · J30, ajusté à tes rappels</span></span>
        </button>
      )}
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}

function UnitSheet({ unit, onClose }: { unit: StudyUnit; onClose: () => void }) {
  const { state, update, toast, updateUndoable } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const plan = state.reviewPlans.find(p => p.unitId === unit.id && p.active)
  const logs = state.reviewLogs.filter(l => l.unitId === unit.id).slice(-5).reverse()
  const [editing, setEditing] = useState(false)

  return (
    <Sheet title={unit.name} onClose={onClose}>
      <p style={{ color: 'var(--secondary-label)', fontSize: 14 }}>
        {KIND_LABELS[unit.kind]}{unit.source && ` · ${unit.source}`}
      </p>

      <SectionHeader>Comment réviser ce type de contenu</SectionHeader>
      <div className="card" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <ul style={{ paddingLeft: 20, color: 'var(--secondary-label)', lineHeight: 1.7, fontSize: 15 }}>
          {KIND_METHODS[unit.kind].map(m => <li key={m}>{m}</li>)}
        </ul>
      </div>

      {plan ? (
        <>
          <SectionHeader>Plan de révision</SectionHeader>
          <div className="card">
            <p style={{ fontSize: 15 }}>
              Prochaine révision : <strong>{relativeLabel(plan.nextDue, today)}</strong>
              {' '}· étape {Math.min(plan.stage + 1, J_SEQUENCE.length)} / {J_SEQUENCE.length}
            </p>
            <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 4 }}>
              Appris le {plan.learnedOn}. L'intervalle s'ajuste à chaque rappel : facile allonge, difficile rapproche.
            </p>
          </div>
        </>
      ) : (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={() => {
          update(s => ({ ...s, reviewPlans: [...s.reviewPlans, createPlan(unit.id, today)] }))
          toast('Plan de révision lancé.')
        }}>
          Lancer le plan de révision
        </button>
      )}

      {logs.length > 0 && (
        <>
          <SectionHeader>Derniers rappels</SectionHeader>
          <div className="list-group">
            {logs.map(l => (
              <div key={l.id} className="list-row">
                <span className="row-main"><span className="row-title" style={{ fontSize: 15 }}>{l.date}</span></span>
                <span className="row-detail">{{ oublie: 'Oublié', difficile: 'Difficile', moyen: 'Moyen', facile: 'Facile' }[l.rating]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }}
        onClick={() => { onClose(); ui.openTimerStart({ minutes: 25, unitId: unit.id }) }}>
        Réviser maintenant (25 min)
      </button>
      <button className="btn-plain btn-block" style={{ marginTop: 8, minHeight: 44 }} onClick={() => setEditing(true)}>
        Modifier le chapitre
      </button>
      <button className="btn-plain btn-block" style={{ color: 'var(--danger)', minHeight: 44 }} onClick={() => {
        updateUndoable('Chapitre archivé.', s => ({
          ...s,
          studyUnits: s.studyUnits.map(u => u.id === unit.id ? { ...u, archived: true } : u),
          reviewPlans: s.reviewPlans.map(p => p.unitId === unit.id ? { ...p, active: false } : p)
        }))
        onClose()
      }}>
        Archiver le chapitre
      </button>
      {editing && <UnitEditor subjectId={unit.subjectId} unit={unit} onClose={() => setEditing(false)} />}
    </Sheet>
  )
}

function ErrorJournal() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [editing, setEditing] = useState<ErrorLog | 'new' | null>(null)
  const pending = state.errorLogs.filter(e => !e.retested)
  const done = state.errorLogs.filter(e => e.retested).slice(-10).reverse()

  return (
    <div className="screen">
      <BackHeader title="Journal d'erreurs" onBack={() => ui.setSub('review', null)} action="Nouvelle" onAction={() => setEditing('new')} />
      <p className="subtitle-context">Erreur → cause → règle correcte → retest. C'est le circuit qui rapporte le plus.</p>
      {pending.length === 0 && done.length === 0 ? (
        <EmptyState title="Aucune erreur notée">
          À la prochaine erreur en exercice ou QCM, note-la ici avec sa cause et la règle correcte.
        </EmptyState>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <SectionHeader>À retester</SectionHeader>
              <div className="list-group">
                {pending.map(e => (
                  <div key={e.id} className="list-row">
                    <button className="check-btn" aria-label="Marquer comme retestée" onClick={() => {
                      update(s => ({ ...s, errorLogs: s.errorLogs.map(x => x.id === e.id ? { ...x, retested: true } : x) }))
                      toast('Erreur retestée. Solide.')
                    }}>
                      <span className="check-circle"><Icon name="check" size={14} /></span>
                    </button>
                    <button className="row-main" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setEditing(e)}>
                      <span className="row-title" style={{ display: 'block' }}>{e.error}</span>
                      <span className="row-sub">
                        {e.retestOn ? `retest ${relativeLabel(e.retestOn, today)}` : 'pas de date de retest'}
                        {e.subjectId && ` · ${state.subjects.find(s => s.id === e.subjectId)?.name ?? ''}`}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {done.length > 0 && (
            <>
              <SectionHeader>Retestées</SectionHeader>
              <div className="list-group">
                {done.map(e => (
                  <button key={e.id} className="list-row" onClick={() => setEditing(e)}>
                    <span className="check-circle checked"><Icon name="check" size={14} /></span>
                    <span className="row-main"><span className="row-title" style={{ color: 'var(--secondary-label)' }}>{e.error}</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {editing && <ErrorEditor error={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ErrorEditor({ error, onClose }: { error: ErrorLog | null; onClose: () => void }) {
  const { state, update, toast } = useApp()
  const today = todayISO(state.profile.timezone)
  const [errText, setErrText] = useState(error?.error ?? '')
  const [cause, setCause] = useState(error?.cause ?? '')
  const [rule, setRule] = useState(error?.rule ?? '')
  const [retestOn, setRetestOn] = useState(error?.retestOn ?? addDays(today, 2))
  const [subjectId, setSubjectId] = useState(error?.subjectId ?? '')

  const save = () => {
    if (!errText.trim()) { toast('Décris l\'erreur.'); return }
    const fields = {
      error: errText.trim(), cause: cause.trim(), rule: rule.trim(),
      retestOn: retestOn || null, subjectId: subjectId || null
    }
    if (error) {
      update(s => ({ ...s, errorLogs: s.errorLogs.map(e => e.id === error.id ? { ...e, ...fields } : e) }))
    } else {
      update(s => ({ ...s, errorLogs: [...s.errorLogs, { id: newId('err'), ...fields, retested: false, createdAt: nowISO() }] }))
    }
    onClose()
  }

  return (
    <Sheet title={error ? 'Erreur' : 'Nouvelle erreur'} onClose={onClose}>
      <label className="field-label" htmlFor="ee-err">L'erreur</label>
      <input id="ee-err" className="field" value={errText} onChange={e => setErrText(e.target.value)} autoFocus
        placeholder="ex. Confondu nerf médian et ulnaire au canal carpien" />
      <label className="field-label" htmlFor="ee-cause">La cause probable</label>
      <input id="ee-cause" className="field" value={cause} onChange={e => setCause(e.target.value)}
        placeholder="ex. Appris sans schéma, jamais testé" />
      <label className="field-label" htmlFor="ee-rule">La règle correcte</label>
      <textarea id="ee-rule" className="field" rows={2} value={rule} onChange={e => setRule(e.target.value)}
        placeholder="La bonne version, formulée pour t'en souvenir" />
      <label className="field-label" htmlFor="ee-retest">Date de retest</label>
      <input id="ee-retest" className="field" type="date" value={retestOn ?? ''} onChange={e => setRetestOn(e.target.value)} />
      {state.subjects.length > 0 && (
        <>
          <label className="field-label" htmlFor="ee-subject">Matière</label>
          <select id="ee-subject" className="field" value={subjectId ?? ''} onChange={e => setSubjectId(e.target.value)}>
            <option value="">Aucune</option>
            {state.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </>
      )}
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 20 }} onClick={save}>Enregistrer</button>
    </Sheet>
  )
}

function AnkiCompanion() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const [cardsDone, setCardsDone] = useState('')
  const [duration, setDuration] = useState('')
  const [success, setSuccess] = useState('')
  const recent = state.ankiLogs.slice(-7).reverse()

  const save = () => {
    const cards = parseInt(cardsDone, 10)
    if (!cards || cards <= 0) { toast('Indique le nombre de cartes faites.'); return }
    update(s => ({
      ...s,
      ankiLogs: [...s.ankiLogs, {
        id: newId('anki'), date: today, cardsGoal: null, cardsDone: cards,
        durationMin: duration ? parseInt(duration, 10) || null : null,
        successRate: success ? Math.min(100, Math.max(0, parseInt(success, 10) || 0)) : null,
        createdAt: nowISO()
      }]
    }))
    setCardsDone(''); setDuration(''); setSuccess('')
    toast('Session Anki enregistrée.')
  }

  return (
    <div className="screen">
      <BackHeader title="Compagnon Anki" onBack={() => ui.setSub('review', null)} />
      <p className="subtitle-context">
        Anki reste le meilleur outil pour les cartes. Cap suit tes sessions pour les relier
        au reste — il ne remplace pas Anki. Les révisions Anki (cartes) et les révisions de
        chapitre (compréhension) sont deux choses différentes.
      </p>
      <div className="card">
        <label className="field-label" htmlFor="ak-cards" style={{ marginTop: 0 }}>Cartes faites</label>
        <input id="ak-cards" className="field" type="number" inputMode="numeric" value={cardsDone}
          onChange={e => setCardsDone(e.target.value)} placeholder="ex. 120" />
        <label className="field-label" htmlFor="ak-dur">Durée (min, facultatif)</label>
        <input id="ak-dur" className="field" type="number" inputMode="numeric" value={duration}
          onChange={e => setDuration(e.target.value)} />
        <label className="field-label" htmlFor="ak-succ">Taux de réussite % (facultatif)</label>
        <input id="ak-succ" className="field" type="number" inputMode="numeric" value={success}
          onChange={e => setSuccess(e.target.value)} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      </div>
      {recent.length > 0 && (
        <>
          <SectionHeader>Dernières sessions</SectionHeader>
          <div className="list-group">
            {recent.map(l => (
              <div key={l.id} className="list-row">
                <span className="row-main"><span className="row-title" style={{ fontSize: 15 }}>{l.date}</span></span>
                <span className="row-detail">
                  {l.cardsDone} cartes{l.durationMin ? ` · ${l.durationMin} min` : ''}{l.successRate != null ? ` · ${l.successRate}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
