// Moi : revue de la semaine, insights, science & mythes, profil, réglages,
// confidentialité, données (export/import), installation.

import React, { useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { computeInsights, notEnoughDataMessage } from '../domain/insights'
import { exportBackup, validateImport, mergeStates, type ImportPreview } from '../domain/backup'
import { defaultState, APP_VERSION } from '../domain/types'
import { todayISO, addDays, isoWeekday, daysBetween, nowISO, isValidCivil, ageAt } from '../lib/dates'
import { newId } from '../lib/id'
import { readLegacyV6 } from '../storage/db'

export function Me() {
  const ui = useUi()
  const sub = ui.sub.me ?? null
  if (sub === 'weekly') return <WeeklyReviewView />
  if (sub === 'science') return <ScienceView />
  if (sub === 'data') return <DataView />
  if (sub === 'settings') return <SettingsView />
  return <MeHome />
}

function MeHome() {
  const { state } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const insights = useMemo(() => computeInsights(state, today), [state, today])

  return (
    <div className="screen">
      <h1 className="large-title">Moi</h1>
      <p className="subtitle-context">
        {state.profile.firstName} · {ageAt(state.profile.birthDate, today)} ans · réglages et tendances
      </p>

      <div className="list-group">
        <button className="list-row" onClick={() => ui.setSub('me', 'weekly')}>
          <Icon name="plan" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Revue de la semaine</span>
            <span className="row-sub">5 étapes, moins de 10 minutes</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('me', 'science')}>
          <Icon name="info" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Science et mythes</span>
            <span className="row-sub">Ce qui est solide, probable, limité ou non démontré</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('me', 'data')}>
          <Icon name="export" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Données</span>
            <span className="row-sub">Export, import, confidentialité, suppression</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('me', 'settings')}>
          <Icon name="settings" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Profil et réglages</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>

      {(() => {
        const last = [...state.weeklyReviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0]
        if (!last || last.priorities.length === 0) return null
        return (
          <>
            <SectionHeader>Priorités de la semaine</SectionHeader>
            <div className="card">
              {last.priorities.map((p, i) => (
                <p key={i} style={{ fontSize: 15, lineHeight: 1.7 }}>{i + 1}. {p}</p>
              ))}
            </div>
          </>
        )
      })()}

      <SectionHeader>Tendances</SectionHeader>
      {insights.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>{notEnoughDataMessage()}</p>
        </div>
      ) : (
        insights.map(i => (
          <div key={i.id} className="card">
            <p style={{ fontSize: 15, lineHeight: 1.5 }}>{i.text}</p>
            <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 6 }}>Échantillon : {i.sample}</p>
          </div>
        ))
      )}

      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
        Cap {APP_VERSION} · données locales uniquement · aucun compte, aucun tracker
      </p>
    </div>
  )
}

/* ─── Revue hebdomadaire ───────────────────────────────────────────── */

function WeeklyReviewView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const monday = addDays(today, -(isoWeekday(today) - 1))
  const [step, setStep] = useState(0)
  const [priorities, setPriorities] = useState(['', '', ''])

  const weekAgo = addDays(today, -7)
  const doneTasks = state.tasks.filter(t => t.done && t.completedAt && t.completedAt.slice(0, 10) >= weekAgo)
  const sessions = state.focusSessions.filter(s => s.startedAt.slice(0, 10) >= weekAgo)
  const overdue = state.tasks.filter(t => !t.done && !t.deletedAt && t.deadline && daysBetween(today, t.deadline) < 0)
  const inboxCount = state.captures.filter(c => !c.processedAt).length
  const projectsNoNext = state.projects.filter(p => p.status === 'actif' && !p.nextAction.trim())

  const finish = () => {
    const cleaned = priorities.map(p => p.trim()).filter(Boolean)
    update(s => ({
      ...s,
      weeklyReviews: [...s.weeklyReviews.filter(w => w.weekOf !== monday), {
        id: newId('wr'), weekOf: monday, priorities: cleaned, notes: '', completedAt: nowISO()
      }]
    }))
    toast('Revue terminée. Semaine cadrée.')
    ui.setSub('me', null)
  }

  const steps = [
    <div key="0" className="card">
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>1 · Vider l'Inbox</h2>
      <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>
        {inboxCount === 0 ? 'Inbox vide. Rien à trier — parfait.' : `${inboxCount} élément${inboxCount > 1 ? 's' : ''} à trier.`}
      </p>
      {inboxCount > 0 && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => ui.navigate('plan', 'inbox')}>
          Ouvrir l'Inbox
        </button>
      )}
      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => setStep(1)}>Étape suivante</button>
    </div>,
    <div key="1" className="card">
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>2 · Ce qui a été fait</h2>
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
        Cette semaine : <strong>{doneTasks.length}</strong> tâche{doneTasks.length !== 1 ? 's' : ''} terminée{doneTasks.length !== 1 ? 's' : ''},{' '}
        <strong>{sessions.length}</strong> session{sessions.length !== 1 ? 's' : ''} de focus.
      </p>
      {doneTasks.slice(0, 5).map(t => (
        <p key={t.id} style={{ color: 'var(--secondary-label)', fontSize: 14 }}>· {t.title}</p>
      ))}
      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => setStep(2)}>Étape suivante</button>
    </div>,
    <div key="2" className="card">
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>3 · Retards et inutile</h2>
      {overdue.length === 0 ? (
        <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>Aucune échéance dépassée.</p>
      ) : (
        <>
          <p style={{ fontSize: 15 }}>{overdue.length} tâche{overdue.length > 1 ? 's' : ''} en retard — replanifie ou supprime ce qui n'a plus de sens :</p>
          {overdue.slice(0, 5).map(t => <p key={t.id} style={{ color: 'var(--secondary-label)', fontSize: 14 }}>· {t.title}</p>)}
          <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => ui.navigate('plan', null)}>Ouvrir le Plan</button>
        </>
      )}
      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => setStep(3)}>Étape suivante</button>
    </div>,
    <div key="3" className="card">
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>4 · Projets, objectifs, révisions</h2>
      {projectsNoNext.length > 0 ? (
        <p style={{ fontSize: 15 }}>
          {projectsNoNext.length} projet{projectsNoNext.length > 1 ? 's' : ''} sans prochaine action : {projectsNoNext.map(p => p.name).join(', ')}.
        </p>
      ) : (
        <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>Tous les projets actifs ont une prochaine action.</p>
      )}
      <p style={{ color: 'var(--secondary-label)', fontSize: 15, marginTop: 8 }}>
        Jette un œil aux examens à venir et aux chapitres sans plan de révision.
      </p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => setStep(4)}>Étape suivante</button>
    </div>,
    <div key="4" className="card">
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>5 · Trois priorités de la semaine</h2>
      {priorities.map((p, i) => (
        <input key={i} className="field" style={{ marginBottom: 8 }} value={p}
          onChange={e => setPriorities(ps => ps.map((x, j) => j === i ? e.target.value : x))}
          placeholder={`Priorité ${i + 1}`} aria-label={`Priorité ${i + 1}`} />
      ))}
      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={finish}>Terminer la revue</button>
    </div>
  ]

  return (
    <div className="screen">
      <BackHeader title="Revue hebdo" onBack={() => ui.setSub('me', null)} />
      <div className="sos-progress" aria-label={`Étape ${step + 1} sur 5`}>
        {[0, 1, 2, 3, 4].map(i => <span key={i} className={i <= step ? 'done' : ''} style={i <= step ? { background: 'var(--tint)' } : {}} />)}
      </div>
      {steps[step]}
      {step > 0 && <button className="btn-plain" style={{ minHeight: 44 }} onClick={() => setStep(step - 1)}>Étape précédente</button>}
    </div>
  )
}

/* ─── Science et mythes ────────────────────────────────────────────── */

type Level = 'solide' | 'probable' | 'limite' | 'non'
const LEVEL_LABEL: Record<Level, string> = { solide: 'Solide', probable: 'Probable', limite: 'Limité', non: 'Non démontré' }

const SCIENCE: Array<{ title: string; level: Level; text: string }> = [
  {
    title: 'Se tester rapporte plus que relire', level: 'solide',
    text: 'Le rappel actif (se tester sans support, puis vérifier) produit une mémorisation nettement meilleure que la relecture. C\'est un des effets les plus répliqués des sciences de l\'apprentissage. C\'est pour ça que Cap pousse les sessions de rappel et le journal d\'erreurs.'
  },
  {
    title: 'Espacer les révisions bat le bachotage', level: 'solide',
    text: 'Revoir un contenu à intervalles croissants (J1, J3, J7…) retient mieux qu\'une seule grosse session. Les intervalles exacts importent moins que le principe : revoir juste avant d\'oublier. La Méthode des J de Cap est un point de départ, ajusté à tes rappels.'
  },
  {
    title: 'Le feedback immédiat corrige les fausses certitudes', level: 'solide',
    text: 'Répondre puis vérifier tout de suite corrige les erreurs de calibration (« je croyais savoir »). D\'où le format question → réponse → vérification des protocoles de session.'
  },
  {
    title: 'Le sommeil consolide la mémoire', level: 'solide',
    text: 'Le sommeil participe à la consolidation des apprentissages, et les adolescents ont besoin de 8 à 10 h. Une heure de lever stable est le levier le plus simple. En revanche, les « stades de sommeil » estimés par une montre sur une seule nuit sont peu fiables.'
  },
  {
    title: 'Les plans « si… alors… » aident à tenir un engagement', level: 'probable',
    text: 'Décider à l\'avance une réponse concrète à une situation précise (« si X, alors je fais Y ») augmente les chances de suivre son intention. Effet démontré dans de nombreux domaines, taille d\'effet variable selon les personnes.'
  },
  {
    title: 'Surfer l\'envie plutôt que lutter contre', level: 'probable',
    text: 'Observer une envie monter puis redescendre sans agir (urge surfing) est une technique utilisée en thérapie comportementale. Les envies sont temporaires ; répéter une réponse alternative dans le même contexte affaiblit progressivement l\'automatisme.'
  },
  {
    title: 'L\'abstinence « resette la dopamine »', level: 'non',
    text: 'Mythe répandu. Le système dopaminergique n\'est pas une jauge qui se vide et se recharge. Aucune donnée solide ne montre un « reset » cérébral daté (J+7, J+30…). Ce qui change avec le temps, c\'est la force des automatismes appris — via la répétition d\'autres réponses.'
  },
  {
    title: 'L\'abstinence augmente durablement la testostérone', level: 'non',
    text: 'Les études disponibles montrent au mieux des fluctuations courtes et sans conséquence démontrée sur le muscle, l\'énergie ou le charisme. Personne ne peut te promettre ces effets. Ton engagement peut avoir de la valeur pour toi sans avoir besoin de cette justification.'
  },
  {
    title: 'La masturbation est dangereuse pour la santé', level: 'non',
    text: 'C\'est un comportement courant et sans danger physique établi. Ton engagement est un choix personnel légitime — le tenir peut t\'apporter du contrôle et de la fierté — mais il n\'a pas besoin d\'être justifié par une fausse dangerosité.'
  },
  {
    title: 'L\'aisance sociale vient de l\'abstinence', level: 'non',
    text: 'Aucun lien démontré. L\'aisance sociale se développe par des interactions réelles, graduelles et répétées — c\'est exactement ce que travaille l\'échelle du Coach Social.'
  },
  {
    title: 'Chronologie honnête d\'un changement d\'habitude', level: 'limite',
    text: 'Premiers jours : envies fluctuantes, surtout dans les contextes habituels — c\'est normal, pas un signal hormonal. Semaines 2 à 4 : certains contextes deviennent plus faciles si la même alternative est répétée. Au-delà : la durée varie énormément selon les personnes. Le progrès utile se mesure en déclencheurs identifiés et en réponses alternatives répétées, pas en jours parfaits.'
  }
]

function ScienceView() {
  const ui = useUi()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="screen">
      <BackHeader title="Science et mythes" onBack={() => ui.setSub('me', null)} />
      <p className="subtitle-context">
        Chaque affirmation est étiquetée : Solide (consensus), Probable (bonnes données),
        Limité (données partielles), Non démontré (mythe ou absence de preuve).
      </p>
      <div className="list-group">
        {SCIENCE.map(item => (
          <div key={item.title}>
            <button className="list-row" aria-expanded={open === item.title}
              onClick={() => setOpen(open === item.title ? null : item.title)}>
              <span className="row-main">
                <span className="row-title" style={{ whiteSpace: 'normal' }}>{item.title}</span>
              </span>
              <span className={`evidence-badge evidence-${item.level}`}>{LEVEL_LABEL[item.level]}</span>
            </button>
            {open === item.title && (
              <p style={{ padding: '0 16px 14px', color: 'var(--secondary-label)', fontSize: 15, lineHeight: 1.55 }}>
                {item.text}
              </p>
            )}
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
        Sources principales : revues systématiques sur la pratique de récupération et la répétition espacée
        (Dunlosky et al. ; Adesope et al.), recommandations de sommeil adolescent (CDC/AAP), littérature sur
        les implementation intentions (Gollwitzer & Sheeran). Cap simplifie sans trahir : en cas de doute,
        le niveau de preuve est abaissé.
      </p>
    </div>
  )
}

/* ─── Données ──────────────────────────────────────────────────────── */

function DataView() {
  const { state, update, updateUndoable, toast } = useApp()
  const ui = useUi()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const legacy = readLegacyV6()

  const doExport = () => {
    const backup = exportBackup(state)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cap-gabriel-${todayISO(state.profile.timezone)}.json`
    a.click()
    URL.revokeObjectURL(url)
    update(s => ({ ...s, settings: { ...s.settings, lastBackupAt: nowISO() } }))
    toast('Sauvegarde téléchargée.')
  }

  const onFile = async (file: File) => {
    setImportError('')
    try {
      if (file.size > 20 * 1024 * 1024) { setImportError('Fichier trop volumineux (max 20 Mo).'); return }
      const parsed = JSON.parse(await file.text())
      const p = validateImport(parsed)
      if (!p.valid) { setImportError(p.error ?? 'Sauvegarde non reconnue.'); return }
      setPreview(p)
    } catch {
      setImportError('Ce fichier ne correspond pas à une sauvegarde Cap reconnue. Aucune donnée n\'a été modifiée.')
    }
  }

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!preview?.state) return
    const incoming = preview.state
    if (mode === 'merge') {
      updateUndoable('Sauvegarde fusionnée.', s => mergeStates(s, incoming))
    } else {
      updateUndoable('Données remplacées par la sauvegarde.', () => ({
        ...incoming,
        settings: { ...incoming.settings, onboardingDone: true }
      }))
    }
    setPreview(null)
  }

  const wipe = () => {
    update(() => ({ ...defaultState(), settings: { ...defaultState().settings, onboardingDone: false } }))
    toast('Toutes les données ont été supprimées.')
  }

  return (
    <div className="screen">
      <BackHeader title="Données" onBack={() => ui.setSub('me', null)} />

      <SectionHeader>Confidentialité</SectionHeader>
      <div className="card">
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--secondary-label)' }}>
          Toutes tes données (journal, humeur, envies, sommeil…) restent dans ce navigateur,
          sur cet appareil. Aucun compte, aucun serveur, aucun tracker, aucune analytics.
          Le lien de l'app est public : n'importe qui peut charger l'interface, mais personne
          ne voit tes données. Attention : supprimer les données de Safari efface aussi Cap.
          Il n'y a pas de synchronisation entre appareils — utilise l'export/import pour transférer.
        </p>
      </div>

      <SectionHeader>Sauvegarde</SectionHeader>
      <div className="list-group">
        <button className="list-row" onClick={doExport}>
          <Icon name="export" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Exporter une sauvegarde</span>
            <span className="row-sub">
              {state.settings.lastBackupAt
                ? `Dernier export : ${state.settings.lastBackupAt.slice(0, 10)}`
                : 'Jamais exporté — recommandé'}
            </span></span>
        </button>
        <button className="list-row" onClick={() => fileRef.current?.click()}>
          <Icon name="capture" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Importer une sauvegarde</span>
            <span className="row-sub">Aperçu avant toute modification</span></span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      {importError && <p className="field-error" role="alert">{importError}</p>}

      {legacy && (
        <>
          <SectionHeader>Ancienne version détectée</SectionHeader>
          <div className="card">
            <p style={{ fontSize: 15, color: 'var(--secondary-label)' }}>
              Une clé « cap-gabriel-v6 » existe sur ce domaine ({(legacy.length / 1024).toFixed(1)} Ko).
              Son format n'est pas connu avec certitude : exporte-la d'abord, la donnée source
              ne sera jamais supprimée automatiquement.
            </p>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => {
              const blob = new Blob([legacy], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = 'cap-gabriel-v6-brut.json'; a.click()
              URL.revokeObjectURL(url)
              toast('Copie brute téléchargée.')
            }}>
              Télécharger la copie brute
            </button>
          </div>
        </>
      )}

      <SectionHeader>Zone sensible</SectionHeader>
      <div className="card">
        {!confirmWipe ? (
          <button className="btn-plain btn-block" style={{ color: 'var(--danger)', minHeight: 44 }} onClick={() => setConfirmWipe(true)}>
            Supprimer toutes les données
          </button>
        ) : (
          <>
            <p style={{ fontSize: 15, marginBottom: 12 }}>
              Tout sera effacé définitivement sur cet appareil. As-tu fait un export ?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger btn-block" onClick={wipe}>Tout supprimer</button>
              <button className="btn btn-secondary btn-block" onClick={() => setConfirmWipe(false)}>Garder</button>
            </div>
          </>
        )}
      </div>

      <SectionHeader>Installer sur iPhone</SectionHeader>
      <div className="card">
        <ol style={{ paddingLeft: 20, fontSize: 15, lineHeight: 1.8, color: 'var(--secondary-label)' }}>
          <li>Ouvre ce site dans Safari</li>
          <li>Touche le bouton Partager (carré avec flèche)</li>
          <li>« Sur l'écran d'accueil »</li>
          <li>Confirme — Cap s'ouvre alors en plein écran, même hors ligne</li>
        </ol>
      </div>

      {preview && (
        <Sheet title="Aperçu de l'import" onClose={() => setPreview(null)}>
          <p style={{ fontSize: 15, color: 'var(--secondary-label)' }}>
            Sauvegarde du {preview.exportedAt?.slice(0, 10) ?? 'date inconnue'} (schéma v{preview.schemaVersion}).
          </p>
          <div className="list-group" style={{ marginTop: 12 }}>
            {Object.entries(preview.counts).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} className="list-row">
                <span className="row-main"><span className="row-title" style={{ fontSize: 15 }}>{k}</span></span>
                <span className="row-detail">{v}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={() => applyImport('merge')}>
            Fusionner avec mes données
          </button>
          <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={() => applyImport('replace')}>
            Remplacer mes données
          </button>
          <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 12 }}>
            Fusion : ajoute ce qui manque, ne touche pas à l'existant. Remplacement : écrase tout
            (annulable pendant quelques secondes via le bouton Annuler).
          </p>
        </Sheet>
      )}
    </div>
  )
}

/* ─── Réglages ─────────────────────────────────────────────────────── */

function SettingsView() {
  const { state, update, toast } = useApp()
  const ui = useUi()
  const [firstName, setFirstName] = useState(state.profile.firstName)
  const [birthDate, setBirthDate] = useState(state.profile.birthDate)
  const [wakeTarget, setWakeTarget] = useState(state.profile.wakeTarget)
  const [startDate, setStartDate] = useState(state.commitment.startDate)

  const save = () => {
    if (!isValidCivil(birthDate)) { toast('Date de naissance invalide.'); return }
    if (!isValidCivil(startDate)) { toast('Date de départ invalide.'); return }
    update(s => ({
      ...s,
      profile: { ...s.profile, firstName: firstName.trim() || 'Gabriel', birthDate, wakeTarget },
      commitment: { ...s.commitment, startDate }
    }))
    toast('Réglages enregistrés.')
  }

  return (
    <div className="screen">
      <BackHeader title="Réglages" onBack={() => ui.setSub('me', null)} />

      <SectionHeader>Profil</SectionHeader>
      <div className="card">
        <label className="field-label" htmlFor="st-name" style={{ marginTop: 0 }}>Prénom</label>
        <input id="st-name" className="field" value={firstName} onChange={e => setFirstName(e.target.value)} />
        <label className="field-label" htmlFor="st-birth">Date de naissance</label>
        <input id="st-birth" className="field" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
        <label className="field-label" htmlFor="st-wake">Heure de lever cible</label>
        <input id="st-wake" className="field" type="time" value={wakeTarget} onChange={e => setWakeTarget(e.target.value)} />
        <label className="field-label" htmlFor="st-start">Départ de l'engagement</label>
        <input id="st-start" className="field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      </div>

      <SectionHeader>Apparence et confidentialité</SectionHeader>
      <div className="list-group">
        <button className="list-row" aria-pressed={state.settings.reducedTransparency}
          onClick={() => update(s => ({ ...s, settings: { ...s.settings, reducedTransparency: !s.settings.reducedTransparency } }))}>
          <span className={`check-circle${state.settings.reducedTransparency ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
          <span className="row-main"><span className="row-title">Réduire la transparence</span>
            <span className="row-sub">Barres opaques — utile si le flou gêne ou rame</span></span>
        </button>
        <button className="list-row" aria-pressed={state.settings.hideSensitivePreviews}
          onClick={() => update(s => ({ ...s, settings: { ...s.settings, hideSensitivePreviews: !s.settings.hideSensitivePreviews } }))}>
          <span className={`check-circle${state.settings.hideSensitivePreviews ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
          <span className="row-main"><span className="row-title">Masquer les aperçus sensibles</span>
            <span className="row-sub">Le journal n'affiche plus son contenu en liste</span></span>
        </button>
      </div>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, margin: '4px 4px 0', lineHeight: 1.5 }}>
        Les données ne sont pas chiffrées : elles sont simplement locales à ce navigateur.
        Le mode sombre suit le réglage du système.
      </p>
    </div>
  )
}
