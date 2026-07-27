// Moi : revue de la semaine, insights, science & mythes, profil, réglages,
// confidentialité, données (export/import), installation.

import React, { useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet, Segmented, SectionHeader, EmptyState } from '../ui/Sheet'
import { BackHeader } from './Plan'
import { DateField, TimeField } from '../ui/pickers'
import { BarChart, HBarChart, Heatmap } from '../ui/charts'
import { dailyCompletion } from '../domain/habits'
import { ACCENTS } from '../ui/accents'
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
  if (sub === 'guide') return <GuideView />
  if (sub === 'stats') return <StatsView />
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
        <button className="list-row" onClick={() => ui.setSub('me', 'guide')}>
          <Icon name="book" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Guide d'utilisation</span>
            <span className="row-sub">Tout ce que Cap sait faire, expliqué pas à pas</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('me', 'stats')}>
          <Icon name="body" size={22} className="chevron" />
          <span className="row-main"><span className="row-title">Statistiques</span>
            <span className="row-sub">Heatmaps de focus et d'habitudes, énergie, matières</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
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
          <span className="row-main"><span className="row-title">Réglages</span>
            <span className="row-sub">Apparence, profil, engagement, confidentialité</span></span>
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

      <FocusChart />

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

/** Minutes de focus par jour, 7 derniers jours. */
function FocusChart() {
  const { state } = useApp()
  const today = todayISO(state.profile.timezone)
  const days: Array<{ label: string; value: number | null; highlight?: boolean }> = []
  const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  let total = 0
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i)
    const minutes = state.focusSessions
      .filter(s => s.endedAt && s.startedAt.slice(0, 10) === date)
      .reduce((a, s) => a + (s.workedMin ?? s.plannedMin), 0)
    total += minutes
    days.push({
      label: letters[isoWeekday(date) - 1],
      value: minutes,
      highlight: date === today
    })
  }
  if (total === 0) return null
  return (
    <>
      <SectionHeader>Focus — 7 derniers jours</SectionHeader>
      <div className="card">
        <BarChart data={days} formatValue={v => `${v} min`} />
        <p style={{ color: 'var(--tertiary-label)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          {total >= 60 ? `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}` : `${total} min`} de focus cette semaine
        </p>
      </div>
    </>
  )
}

/* ─── Statistiques ─────────────────────────────────────────────────── */

function StatsView() {
  const { state } = useApp()
  const ui = useUi()
  const today = todayISO(state.profile.timezone)
  const DAYS = 26 * 7

  // Heatmap focus : minutes par jour, normalisées
  const focusByDay = new Map<string, number>()
  for (const s of state.focusSessions) {
    if (!s.endedAt) continue
    const d = s.startedAt.slice(0, 10)
    focusByDay.set(d, (focusByDay.get(d) ?? 0) + (s.workedMin ?? s.plannedMin))
  }
  const maxFocus = Math.max(25, ...focusByDay.values())
  const focusDays: Array<{ date: string; value: number | null }> = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const min = focusByDay.get(date) ?? 0
    focusDays.push({ date, value: min === 0 ? 0 : min / maxFocus })
  }
  const totalFocus = [...focusByDay.values()].reduce((a, b) => a + b, 0)

  // Heatmap habitudes : % faites par jour
  const habitDays = dailyCompletion(state.routines, state.routineLogs, today, DAYS)
    .map(d => ({ date: d.date, value: d.rate }))
  const hasHabits = state.routines.some(r => !r.archived)

  // Focus par matière (top 5)
  const bySubject = new Map<string, number>()
  for (const s of state.focusSessions) {
    if (!s.endedAt || !s.unitId) continue
    const unit = state.studyUnits.find(u => u.id === s.unitId)
    const subj = unit && state.subjects.find(x => x.id === unit.subjectId)
    if (subj) bySubject.set(subj.name, (bySubject.get(subj.name) ?? 0) + (s.workedMin ?? s.plannedMin))
  }
  const topSubjects = [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, value]) => ({ label, value }))

  // Énergie des 14 derniers jours
  const energyDays: Array<{ label: string; value: number | null; highlight?: boolean }> = []
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i)
    const ci = state.checkIns.filter(c => c.date === date).sort((a, b) => b.at.localeCompare(a.at))[0]
    energyDays.push({
      label: i % 2 === 0 ? String(Number(date.slice(8, 10))) : '',
      value: ci ? (ci.energy === 'haute' ? 3 : ci.energy === 'moyenne' ? 2 : 1) : null,
      highlight: date === today
    })
  }
  const hasEnergy = energyDays.some(d => d.value !== null)

  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`

  return (
    <div className="screen">
      <BackHeader title="Statistiques" onBack={() => ui.setSub('me', null)} />
      <p className="subtitle-context">Six derniers mois. Les cases se remplissent avec l'usage réel — rien n'est simulé.</p>

      <SectionHeader>Focus — 6 mois</SectionHeader>
      <div className="card">
        {totalFocus === 0 ? (
          <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>
            Aucune session encore. Chaque session de focus terminée colorera sa case ici.
          </p>
        ) : (
          <>
            <Heatmap days={focusDays} />
            <p style={{ color: 'var(--tertiary-label)', fontSize: 12, marginTop: 8 }}>
              {fmtMin(totalFocus)} au total · plus la case est vive, plus la journée a été chargée
            </p>
          </>
        )}
      </div>

      <SectionHeader>Habitudes — 6 mois</SectionHeader>
      <div className="card">
        {!hasHabits ? (
          <p style={{ color: 'var(--secondary-label)', fontSize: 15 }}>
            Crée une habitude (Plan → Habitudes) pour voir ta régularité se dessiner ici.
          </p>
        ) : (
          <>
            <Heatmap days={habitDays} color="var(--success)" />
            <p style={{ color: 'var(--tertiary-label)', fontSize: 12, marginTop: 8 }}>
              Part des habitudes prévues faites chaque jour
            </p>
          </>
        )}
      </div>

      {topSubjects.length > 0 && (
        <>
          <SectionHeader>Focus par matière</SectionHeader>
          <div className="card">
            <HBarChart data={topSubjects} formatValue={fmtMin} />
          </div>
        </>
      )}

      {hasEnergy && (
        <>
          <SectionHeader>Énergie — 14 jours</SectionHeader>
          <div className="card">
            <BarChart data={energyDays} height={72} formatValue={v => ['', 'basse', 'moyenne', 'haute'][v] ?? ''} />
            <p style={{ color: 'var(--tertiary-label)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              Énergie déclarée au check-in (basse, moyenne, haute)
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Guide d'utilisation ──────────────────────────────────────────── */

interface GuideSection {
  id: string
  title: string
  intro: string
  steps: string[]
  action?: { label: string; run: (ui: ReturnType<typeof useUi>) => void }
}

const GUIDE: GuideSection[] = [
  {
    id: 'day', title: 'Démarrer ta journée',
    intro: 'L\'onglet Aujourd\'hui te dit toujours quoi faire maintenant.',
    steps: [
      'Ouvre l\'app → fais le Check-in (15 secondes : énergie, stress, sommeil, envie)',
      'La carte « Maintenant » s\'adapte à ton état et t\'explique pourquoi',
      'Touche « Choisir » à côté de Top 3 pour fixer tes 1 à 3 priorités du jour',
      'Coche une priorité terminée : elle disparaît (bouton Annuler si erreur)'
    ],
    action: { label: 'Faire un check-in', run: ui => ui.openCheckIn() }
  },
  {
    id: 'capture', title: 'Capturer une idée ou une tâche',
    intro: 'Tout ce qui te passe par la tête va dans Cap, pas dans ta mémoire.',
    steps: [
      'Touche le bouton + (en bas à droite, toujours visible)',
      'Écris ce que tu as en tête — c\'est tout, le reste est facultatif',
      'Si tu choisis « Tâche », tu peux la planifier direct (Aujourd\'hui / Demain)',
      'Sinon, ça part dans l\'Inbox : tu trieras plus tard, un élément à la fois',
      'L\'Inbox est dans Plan → Inbox (badge = nombre d\'éléments à trier)'
    ],
    action: { label: 'Capturer maintenant', run: ui => ui.openCapture() }
  },
  {
    id: 'plan', title: 'Planifier tes tâches',
    intro: 'Cap distingue deux dates : « je veux le faire ce jour-là » et « ça doit être fini avant ».',
    steps: [
      'Plan → Nouvelle tâche : le titre suffit, le reste est facultatif',
      '« Je veux la faire le… » = ton intention, elle apparaît dans Aujourd\'hui ce jour-là',
      '« Échéance réelle » = la vraie deadline (examen, rendu…), affichée en retard si dépassée',
      'Ajoute une heure pour voir la tâche dans la timeline du jour',
      'Les onglets Aujourd\'hui / À venir / Un jour / Faites filtrent tes tâches',
      '« Un jour » garde les idées sans encombrer ta semaine'
    ],
    action: { label: 'Ouvrir le Plan', run: ui => ui.navigate('plan', null) }
  },
  {
    id: 'review', title: 'Réviser efficacement (Méthode des J)',
    intro: 'Cap programme tes révisions aux bons moments : J0, J1, J3, J7, J14, J30.',
    steps: [
      'Réviser → crée une Matière (ex. Anatomie), avec sa date d\'examen si connue',
      'Dans la matière, crée un Chapitre quand tu viens de l\'apprendre',
      'Choisis son type (factuel, conceptuel, procédural, spatial…) : Cap te suggère la bonne méthode de rappel',
      'Le plan de révision se lance tout seul : le chapitre apparaîtra dans « À revoir » aux dates J',
      'Après chaque session, note ton rappel : Facile allonge l\'intervalle, Difficile le raccourcit, Oublié → demain',
      'Le badge sur l\'onglet Réviser = nombre de révisions dues aujourd\'hui'
    ],
    action: { label: 'Ouvrir Réviser', run: ui => ui.navigate('review', null) }
  },
  {
    id: 'timer', title: 'Le minuteur de focus',
    intro: 'Trois formats : 25 min (démarrage), 50 min (standard), 90 min (profondeur).',
    steps: [
      'Lance depuis Aujourd\'hui (raccourci Focus), Réviser (sur un chapitre dû) ou la recherche',
      'Fixe un objectif précis avant de lancer — ça change tout',
      'Le minuteur reste exact même si tu verrouilles l\'iPhone ou changes d\'app',
      '« J\'ai été interrompu » : note la distraction, elle part dans l\'Inbox, tu reprends',
      'À la fin : résultat, qualité du focus, une preuve de travail (une phrase suffit)',
      'Si le chapitre était lié, ta note de rappel programme la prochaine révision'
    ],
    action: { label: 'Lancer une session', run: ui => ui.openTimerStart() }
  },
  {
    id: 'errors', title: 'Le journal d\'erreurs',
    intro: 'Le circuit qui rapporte le plus : erreur → cause → règle correcte → retest.',
    steps: [
      'Réviser → Journal d\'erreurs → Nouvelle',
      'Note l\'erreur, sa cause probable et la règle correcte reformulée',
      'Cap propose un retest 2 jours plus tard',
      'Avant un examen, si des erreurs ne sont pas retestées, Cap te le rappelle en priorité'
    ],
    action: { label: 'Ouvrir le journal', run: ui => ui.navigate('review', 'errors') }
  },
  {
    id: 'sos', title: 'Gérer une envie (SOS)',
    intro: 'Le SOS traverse la vague en 5 étapes, sans rien te demander de décider.',
    steps: [
      'Accessible partout : raccourci SOS sur Aujourd\'hui, bouton rouge dans Coach',
      'Étapes : couper le contexte → respirer → nommer → surfer la vague → une action',
      'Si tu notes une envie ≥ 8 au check-in, Cap te propose le SOS direct dans la barre du bas',
      'Coach → Contrôle : crée des plans « si… alors… » pour décider à l\'avance tes réponses',
      'Un écart ? Déclare-le honnêtement : contexte, une leçon, une action protectrice — le record et ce que tu as appris restent'
    ],
    action: { label: 'Voir le module Contrôle', run: ui => ui.navigate('coach', 'control') }
  },
  {
    id: 'sleep', title: 'Mieux dormir',
    intro: 'Une heure de lever stable vaut mieux que tous les gadgets.',
    steps: [
      'Le soir (dès 21 h), Cap te propose la Fermeture du soir : vider la tête, choisir la première action de demain, poser le téléphone',
      'Le matin, note ta nuit en 30 secondes (Coach → Sommeil → Journal)',
      '« Je n\'arrive pas à dormir » : un protocole simple pour les nuits difficiles',
      'Regarde les tendances sur 7-14 jours, jamais une seule nuit'
    ],
    action: { label: 'Ouvrir Sommeil', run: ui => ui.navigate('coach', 'sleep') }
  },
  {
    id: 'coach-rest', title: 'Mental, Corps, Social',
    intro: 'Trois modules légers pour le reste de la vie.',
    steps: [
      'Mental : respiration 1 min, décharger une pensée, journal en une phrase',
      'Corps : note tes séances (type, durée, effort) — bouger aide le sommeil et le focus',
      'Social : une échelle de 7 niveaux progressifs (sourire → conversation → proposer une activité), on mesure les essais, jamais la « réussite »'
    ],
    action: { label: 'Ouvrir le Coach', run: ui => ui.navigate('coach', null) }
  },
  {
    id: 'search', title: 'Tout retrouver en 2 secondes',
    intro: 'La barre « Rechercher ou agir » en bas est le raccourci universel.',
    steps: [
      'Touche-la : recherche floue sur tes tâches, chapitres, projets, notes, erreurs',
      'Elle liste aussi toutes les actions : lancer un minuteur, SOS, fermeture du soir…',
      'Quand un minuteur tourne, la barre l\'affiche avec pause/reprise intégrées'
    ],
    action: { label: 'Ouvrir la recherche', run: ui => ui.openCommand() }
  },
  {
    id: 'weekly', title: 'La revue hebdomadaire',
    intro: '10 minutes le dimanche pour cadrer la semaine.',
    steps: [
      'Moi → Revue de la semaine : 5 étapes guidées',
      'Vider l\'Inbox → voir ce qui est fait → traiter les retards → vérifier projets et révisions → choisir 3 priorités',
      'Tes 3 priorités s\'affichent ensuite dans Moi toute la semaine'
    ],
    action: { label: 'Lancer la revue', run: ui => ui.navigate('me', 'weekly') }
  },
  {
    id: 'data', title: 'Tes données et sauvegardes',
    intro: 'Tout est local : ni compte, ni serveur, ni tracker.',
    steps: [
      'Moi → Données → Exporter : télécharge un fichier de sauvegarde (fais-le régulièrement)',
      'Importer : aperçu complet avant toute modification, fusion ou remplacement au choix',
      'Attention : effacer les données de Safari efface aussi Cap',
      'Pour changer d\'appareil : exporte ici, importe là-bas'
    ],
    action: { label: 'Ouvrir Données', run: ui => ui.navigate('me', 'data') }
  }
]

function GuideView() {
  const ui = useUi()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="screen">
      <BackHeader title="Guide" onBack={() => ui.setSub('me', null)} />
      <p className="subtitle-context">
        Tout ce que Cap sait faire, section par section. Touche un titre pour dérouler.
      </p>
      <div className="list-group">
        {GUIDE.map(g => (
          <div key={g.id}>
            <button className="list-row" aria-expanded={open === g.id}
              onClick={() => setOpen(open === g.id ? null : g.id)}>
              <span className="row-main">
                <span className="row-title" style={{ fontWeight: 600 }}>{g.title}</span>
              </span>
              <Icon name={open === g.id ? 'up' : 'down'} size={16} className="chevron" />
            </button>
            {open === g.id && (
              <div style={{ padding: '0 16px 16px' }}>
                <p style={{ color: 'var(--secondary-label)', fontSize: 15, marginBottom: 8, lineHeight: 1.5 }}>
                  {g.intro}
                </p>
                <ol style={{ paddingLeft: 20, color: 'var(--label)', fontSize: 15, lineHeight: 1.7 }}>
                  {g.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                </ol>
                {g.action && (
                  <button className="btn btn-secondary btn-block" style={{ marginTop: 10 }}
                    onClick={() => g.action!.run(ui)}>
                    {g.action.label}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
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

      {/* L'apparence d'abord : c'est le réglage le plus cherché */}
      <SectionHeader>Apparence</SectionHeader>
      <div className="card">
        <Segmented
          label="Style visuel"
          value={state.settings.appearance}
          onChange={v => update(s => ({ ...s, settings: { ...s.settings, appearance: v } }))}
          options={[
            { value: 'sobre', label: 'Sombre' },
            { value: 'clair', label: 'Clair' },
            { value: 'glass', label: 'Verre sombre' },
            { value: 'glass-clair', label: 'Verre clair' }
          ]}
        />
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
          Clair : palette officielle iOS. Verre : cartes profondes et capsule flottante
          façon Apple Music, en nuit ou en jour.
        </p>

        <span className="field-label">Couleur d'accent</span>
        <div className="accent-row" role="group" aria-label="Couleur d'accent">
          {ACCENTS.map(a => (
            <button
              key={a.id}
              type="button"
              className="accent-dot"
              style={{ background: a.color, color: '#fff', ['--ring' as any]: a.color }}
              aria-label={a.name}
              aria-pressed={state.settings.accent === a.id}
              onClick={() => update(s => ({ ...s, settings: { ...s.settings, accent: a.id } }))}
            >
              {state.settings.accent === a.id && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 10 }}>
          La teinte s'applique partout, immédiatement : boutons, bulle, graphiques, heatmaps.
        </p>
      </div>

      <SectionHeader>Objectif de focus</SectionHeader>
      <div className="card">
        <span className="field-label" style={{ marginTop: 0 }}>Minutes de focus visées par jour</span>
        <div className="chip-row">
          {[0, 60, 90, 120, 180].map(m => (
            <button key={m} type="button" className="chip"
              aria-pressed={state.settings.dailyFocusGoalMin === m}
              onClick={() => update(s => ({ ...s, settings: { ...s.settings, dailyFocusGoalMin: m } }))}>
              {m === 0 ? 'Désactivé' : `${m} min`}
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 10 }}>
          La tuile Focus de l'accueil affiche ta progression vers cet objectif.
        </p>
      </div>

      <SectionHeader>Profil</SectionHeader>
      <div className="card">
        <label className="field-label" htmlFor="st-name" style={{ marginTop: 0 }}>Prénom</label>
        <input id="st-name" className="field" value={firstName} onChange={e => setFirstName(e.target.value)} />
        <DateField label="Date de naissance" value={birthDate} onChange={setBirthDate} allowNone={false} quick={false} />
        <TimeField label="Heure de lever cible" value={wakeTarget} onChange={setWakeTarget} allowNone={false} />
        <DateField label="Départ de l'engagement" value={startDate} onChange={setStartDate} allowNone={false} quick={false} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      </div>

      <SectionHeader>Confidentialité et confort</SectionHeader>
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
      </p>

      <SectionHeader>Aussi dans Moi</SectionHeader>
      <div className="list-group">
        <button className="list-row" onClick={() => ui.setSub('me', 'data')}>
          <Icon name="export" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Données et sauvegarde</span>
            <span className="row-sub">Export, import, suppression</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
        <button className="list-row" onClick={() => ui.setSub('me', 'guide')}>
          <Icon name="book" size={20} className="chevron" />
          <span className="row-main"><span className="row-title">Guide d'utilisation</span></span>
          <Icon name="chevronRight" size={16} className="chevron" />
        </button>
      </div>
    </div>
  )
}
