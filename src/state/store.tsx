// Store applicatif : état en mémoire + persistance IndexedDB automatique,
// annulation (snapshot), toasts accessibles (live region).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState } from '../domain/types'
import { defaultState } from '../domain/types'
import { loadState, saveState, requestPersistence } from '../storage/db'
import { sanitizeState } from '../domain/backup'

export interface Toast {
  id: number
  message: string
  undoLabel?: string
  onUndo?: () => void
}

interface AppContextValue {
  state: AppState
  ready: boolean
  saveError: boolean
  corrupted: boolean
  /** Mutation transactionnelle. Retourne le nouvel état. */
  update: (fn: (s: AppState) => AppState) => void
  /** Mutation avec possibilité d'annulation (toast avec bouton Annuler). */
  updateUndoable: (message: string, fn: (s: AppState) => AppState) => void
  toast: (message: string) => void
  toasts: Toast[]
  dismissToast: (id: number) => void
  retrySave: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastId = 0

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState)
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [corrupted, setCorrupted] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const stateRef = useRef(state)
  stateRef.current = state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await loadState()
      if (cancelled) return
      if (result.state) {
        setState(sanitizeState(result.state))
        if (result.corrupted) setCorrupted(true)
      }
      setReady(true)
      requestPersistence()
    })()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback((s: AppState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveState(s).then(() => setSaveError(false)).catch(() => setSaveError(true))
    }, 150)
  }, [])

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(prev => {
      const next = fn(prev)
      persist(next)
      return next
    })
  }, [persist])

  const dismissToast = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((t: Omit<Toast, 'id'>, ttl = 5000) => {
    const id = ++toastId
    setToasts(ts => [...ts.slice(-2), { ...t, id }])
    setTimeout(() => dismissToast(id), ttl)
  }, [dismissToast])

  const toast = useCallback((message: string) => pushToast({ message }), [pushToast])

  const updateUndoable = useCallback((message: string, fn: (s: AppState) => AppState) => {
    const snapshot = stateRef.current
    setState(prev => {
      const next = fn(prev)
      persist(next)
      return next
    })
    pushToast({
      message,
      undoLabel: 'Annuler',
      onUndo: () => {
        setState(snapshot)
        persist(snapshot)
      }
    }, 6000)
  }, [persist, pushToast])

  const retrySave = useCallback(() => {
    saveState(stateRef.current).then(() => setSaveError(false)).catch(() => setSaveError(true))
  }, [])

  // Sauvegarde en quittant la page (au mieux — synchrone impossible avec IndexedDB,
  // mais le debounce de 150 ms couvre la quasi-totalité des cas).
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveState(stateRef.current).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  const value = useMemo(() => ({
    state, ready, saveError, corrupted, update, updateUndoable, toast, toasts, dismissToast, retrySave
  }), [state, ready, saveError, corrupted, update, updateUndoable, toast, toasts, dismissToast, retrySave])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
