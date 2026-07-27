import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { UiContext, type TabId, type TimerStartOpts } from './ui-context'
import { Icon } from '../ui/Icon'
import { remainingMs } from '../domain/timer'
import { formatDuration, todayISO } from '../lib/dates'
import { todayCheckIn, computeDueQueue } from '../domain/recommend'
import { Today } from '../views/Today'
import { Plan } from '../views/Plan'
import { Review } from '../views/Review'
import { Coach } from '../views/Coach'
import { Me } from '../views/Me'
import { CaptureSheet } from '../ui/CaptureSheet'
import { CheckInSheet } from '../ui/CheckInSheet'
import { CommandCenter } from '../ui/CommandCenter'
import { SOSFlow } from '../ui/SOS'
import { TimerStartSheet, TimerScreen } from '../ui/FocusTimer'
import { EveningSheet } from '../ui/Evening'
import { Onboarding } from '../ui/Onboarding'
import { Sheet } from '../ui/Sheet'
import { APP_VERSION } from '../domain/types'

// Nouveautés annoncées après chaque mise à jour (popup « Quoi de neuf »).
const WHATS_NEW: string[] = [
  'Engrenage Réglages en haut à droite de l\'accueil — là où tu le cherches',
  'Bouton + en haut de Plan (nouvelle tâche) et de Réviser (nouvelle matière)',
  'Réglages réorganisés : l\'Apparence en premier, et Données/Guide accessibles depuis les réglages',
  'La recherche trouve maintenant « Réglages », « Apparence », « Profil »…'
]

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'today', label: "Aujourd'hui", icon: 'today' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
  { id: 'review', label: 'Réviser', icon: 'review' },
  { id: 'coach', label: 'Coach', icon: 'coach' },
  { id: 'me', label: 'Moi', icon: 'me' }
]

type Overlay = null | 'capture' | 'checkin' | 'command' | 'sos' | 'timer-start' | 'timer' | 'evening'

export default function App() {
  const { state, ready, saveError, corrupted, update, toasts, dismissToast, retrySave } = useApp()
  const [tab, setTabRaw] = useState<TabId>('today')
  const [sub, setSubState] = useState<Partial<Record<TabId, string | null>>>({})
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [timerOpts, setTimerOpts] = useState<TimerStartOpts>({})
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const scrollPositions = useRef<Partial<Record<TabId, number>>>({})
  const [, forceTick] = useState(0)

  // rafraîchit l'affichage du minuteur dans la barre (recalcul par timestamps)
  useEffect(() => {
    if (!state.activeTimer) return
    const id = setInterval(() => forceTick(x => x + 1), 1000)
    return () => clearInterval(id)
  }, [state.activeTimer])

  // au retour de suspension : recalculer et ouvrir l'écran si terminé
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && state.activeTimer) {
        forceTick(x => x + 1)
        if (remainingMs(state.activeTimer) <= 0) setOverlay('timer')
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [state.activeTimer])

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true)
    window.addEventListener('cap-update-available', onUpdate)
    return () => window.removeEventListener('cap-update-available', onUpdate)
  }, [])

  // Popup « Quoi de neuf » après une mise à jour
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  useEffect(() => {
    if (ready && state.settings.onboardingDone && state.settings.lastSeenVersion !== APP_VERSION) {
      setShowWhatsNew(true)
    }
  }, [ready, state.settings.onboardingDone, state.settings.lastSeenVersion])
  const dismissWhatsNew = useCallback(() => {
    setShowWhatsNew(false)
    update(s => ({ ...s, settings: { ...s.settings, lastSeenVersion: APP_VERSION } }))
  }, [update])

  const setTab = useCallback((t: TabId) => {
    setTabRaw(prev => {
      if (prev !== t) {
        scrollPositions.current[prev] = window.scrollY
        requestAnimationFrame(() => window.scrollTo(0, scrollPositions.current[t] ?? 0))
      } else {
        // re-taper l'onglet actif : retour à la racine + haut de page (convention iOS)
        setSubState(s => ({ ...s, [t]: null }))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return t
    })
  }, [])

  // Bulle d'onglets draggable : le doigt la fait glisser, relâcher sélectionne.
  const tabBox = useRef<HTMLDivElement>(null)
  const [tabDrag, setTabDrag] = useState<number | null>(null)
  const tabMoved = useRef(false)
  const tabFrac = (clientX: number) => {
    const r = tabBox.current!.getBoundingClientRect()
    return Math.max(0, Math.min(TABS.length - 1, ((clientX - r.left) / Math.max(1, r.width)) * TABS.length - 0.5))
  }
  const onTabDown = (e: React.PointerEvent) => {
    tabMoved.current = false
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setTabDrag(tabFrac(e.clientX))
  }
  const onTabMove = (e: React.PointerEvent) => {
    if (tabDrag === null) return
    tabMoved.current = true
    setTabDrag(tabFrac(e.clientX))
  }
  const onTabUp = () => {
    if (tabDrag === null) return
    const target = TABS[Math.round(tabDrag)]
    setTabDrag(null)
    if (target) { setTab(target.id); setOverlay(null) }
  }

  const setSub = useCallback((t: TabId, s: string | null) => {
    setSubState(prev => ({ ...prev, [t]: s }))
    window.scrollTo(0, 0)
  }, [])

  const navigate = useCallback((t: TabId, s?: string | null) => {
    setTab(t)
    if (s !== undefined) setSub(t, s)
    setOverlay(null)
  }, [setTab, setSub])

  const ui = useMemo(() => ({
    tab, setTab, sub, setSub, navigate,
    openCapture: () => setOverlay('capture'),
    openCheckIn: () => setOverlay('checkin'),
    openCommand: () => setOverlay('command'),
    openSOS: () => setOverlay('sos'),
    openTimerStart: (opts?: TimerStartOpts) => { setTimerOpts(opts ?? {}); setOverlay('timer-start') },
    openTimerScreen: () => setOverlay('timer'),
    openEvening: () => setOverlay('evening')
  }), [tab, setTab, sub, setSub, navigate])

  if (!ready) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--secondary-label)' }}>Chargement…</p>
      </div>
    )
  }

  if (!state.settings.onboardingDone) {
    return <Onboarding />
  }

  const today = todayISO(state.profile.timezone)
  const checkIn = todayCheckIn(state, today)
  const timer = state.activeTimer
  const reduced = state.settings.reducedTransparency
  const appearance = state.settings.appearance
  const cls = 'app-shell'
    + (reduced ? ' reduced-transparency' : '')
    + (appearance === 'glass' && !reduced ? ' theme-glass theme-capsule' : '')
    + (appearance === 'clair' ? ' theme-light' : '')
    + (appearance === 'glass-clair' ? (reduced ? ' theme-light' : ' theme-light theme-glass-light theme-capsule') : '')
  const dueCount = computeDueQueue(state, today).length
  const inboxCount = state.captures.filter(c => !c.processedAt).length
  const tabBadges: Partial<Record<TabId, number>> = { review: dueCount, plan: inboxCount }

  return (
    <UiContext.Provider value={ui}>
      <div className={cls}>
        {updateAvailable && (
          <div className="update-banner" role="status">
            <span style={{ flex: 1, fontSize: 15 }}>Nouvelle version de Cap disponible.</span>
            <button className="btn btn-primary" style={{ minHeight: 38, padding: '0 14px', fontSize: 15 }}
              onClick={() => (window as any).__capApplyUpdate?.()}>
              Recharger
            </button>
            <button aria-label="Plus tard" style={{ minHeight: 38, minWidth: 38, color: 'var(--secondary-label)' }}
              onClick={() => setUpdateAvailable(false)}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        {corrupted && (
          <div role="alert" className="card" style={{ margin: 16, borderLeft: '3px solid var(--warning)' }}>
            Des données locales étaient illisibles. Cap a restauré la dernière copie valide.
            Pense à faire un export dans Moi → Données.
          </div>
        )}
        {saveError && (
          <div role="alert" className="card" style={{ margin: 16, borderLeft: '3px solid var(--danger)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>Cap n'a pas pu enregistrer cette modification.</span>
            <button className="btn btn-secondary" onClick={retrySave}>Réessayer</button>
          </div>
        )}

        <main>
          <div hidden={tab !== 'today'}><Today /></div>
          <div hidden={tab !== 'plan'}><Plan /></div>
          <div hidden={tab !== 'review'}><Review /></div>
          <div hidden={tab !== 'coach'}><Coach /></div>
          <div hidden={tab !== 'me'}><Me /></div>
        </main>

        {/* Barre d'action globale */}
        <div className="action-bar" role="toolbar" aria-label="Actions rapides">
          {timer ? (
            <>
              <button className="action-bar-timer" onClick={() => setOverlay('timer')} aria-label={`Session en cours : ${timer.label}. Ouvrir`}>
                <Icon name="timer" size={20} />
                <span className="timer-label">{timer.label}</span>
                <span className="timer-digits" aria-hidden="true">{formatDuration(Math.max(0, remainingMs(timer)))}</span>
              </button>
              <button
                className="action-bar-add"
                style={{ background: 'var(--tertiary-system-background)' }}
                aria-label={timer.pausedAt ? 'Reprendre le minuteur' : 'Mettre le minuteur en pause'}
                onClick={() => {
                  update(s => {
                    if (!s.activeTimer) return s
                    const t = s.activeTimer
                    return {
                      ...s,
                      activeTimer: t.pausedAt
                        ? { ...t, pausedAt: null, totalPausedMs: t.totalPausedMs + (Date.now() - new Date(t.pausedAt).getTime()), targetEndAt: new Date(new Date(t.targetEndAt).getTime() + Date.now() - new Date(t.pausedAt).getTime()).toISOString() }
                        : { ...t, pausedAt: new Date().toISOString() }
                    }
                  })
                }}
              >
                <Icon name={timer.pausedAt ? 'play' : 'pause'} size={18} />
              </button>
            </>
          ) : checkIn && checkIn.urge >= 8 ? (
            <>
              <button className="action-bar-search" onClick={() => setOverlay('sos')}>
                <Icon name="sos" size={20} className="" />
                <span className="action-bar-urge">Lancer le SOS</span>
              </button>
              <button className="action-bar-add" aria-label="Rechercher ou agir" style={{ background: 'var(--tertiary-system-background)' }} onClick={() => setOverlay('command')}>
                <Icon name="search" size={18} />
              </button>
            </>
          ) : (
            <>
              <button className="action-bar-search" onClick={() => setOverlay('command')}>
                <Icon name="search" size={20} />
                <span>Rechercher ou agir</span>
              </button>
              <button className="action-bar-add" aria-label="Ajouter" onClick={() => setOverlay('capture')}>
                <Icon name="plus" size={20} />
              </button>
            </>
          )}
        </div>

        {/* Tab bar */}
        <nav className="tab-bar" aria-label="Navigation principale">
          <div
            ref={tabBox}
            className="tab-bar-inner"
            style={{ position: 'relative' }}
            onPointerDown={onTabDown}
            onPointerMove={onTabMove}
            onPointerUp={onTabUp}
            onPointerCancel={() => setTabDrag(null)}
          >
            <span
              className="tab-thumb"
              aria-hidden="true"
              style={{
                transform: `translateX(${(tabDrag ?? TABS.findIndex(t => t.id === tab)) * 100}%)`,
                transition: tabDrag !== null ? 'none' : undefined
              }}
            />
            {TABS.map(t => {
              const badge = tabBadges[t.id] ?? 0
              return (
                <button
                  key={t.id}
                  className="tab-item"
                  aria-current={tab === t.id ? 'page' : undefined}
                  aria-label={badge > 0 ? `${t.label}, ${badge} en attente` : undefined}
                  onClick={() => { if (!tabMoved.current) { setTab(t.id); setOverlay(null) } }}
                >
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <Icon name={t.icon} size={24} filled={false} />
                    {badge > 0 && <span className="tab-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span>}
                  </span>
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Toasts */}
        <div className="toast-region" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              <span style={{ flex: 1 }}>{t.message}</span>
              {t.onUndo && (
                <button className="toast-undo" onClick={() => { t.onUndo?.(); dismissToast(t.id) }}>
                  {t.undoLabel ?? 'Annuler'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Overlays */}
        {overlay === 'capture' && <CaptureSheet onClose={() => setOverlay(null)} />}
        {overlay === 'checkin' && <CheckInSheet onClose={() => setOverlay(null)} />}
        {overlay === 'command' && <CommandCenter onClose={() => setOverlay(null)} />}
        {overlay === 'sos' && <SOSFlow onClose={() => setOverlay(null)} />}
        {overlay === 'timer-start' && (
          <TimerStartSheet
            opts={timerOpts}
            onClose={() => setOverlay(null)}
            onStarted={() => setOverlay('timer')}
          />
        )}
        {overlay === 'timer' && <TimerScreen onClose={() => setOverlay(null)} />}
        {overlay === 'evening' && <EveningSheet onClose={() => setOverlay(null)} />}

        {showWhatsNew && (
          <Sheet title={`Nouveautés — Cap ${APP_VERSION}`} onClose={dismissWhatsNew} closeLabel="OK">
            <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 16, color: 'var(--label)' }}>
              {WHATS_NEW.map(item => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
            </ul>
            <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }} onClick={dismissWhatsNew}>
              Compris
            </button>
          </Sheet>
        )}
      </div>
    </UiContext.Provider>
  )
}
