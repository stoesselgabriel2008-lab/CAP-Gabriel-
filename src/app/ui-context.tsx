import { createContext, useContext } from 'react'

export type TabId = 'today' | 'plan' | 'review' | 'coach' | 'me'

export interface TimerStartOpts {
  minutes?: number
  taskId?: string | null
  unitId?: string | null
  label?: string
}

export interface UiContextValue {
  tab: TabId
  setTab: (t: TabId) => void
  /** Sous-route par onglet (ex. plan:'inbox', me:'science'). */
  sub: Partial<Record<TabId, string | null>>
  setSub: (tab: TabId, sub: string | null) => void
  navigate: (tab: TabId, sub?: string | null) => void
  openCapture: () => void
  openCheckIn: () => void
  openCommand: () => void
  openSOS: () => void
  openTimerStart: (opts?: TimerStartOpts) => void
  openTimerScreen: () => void
  openEvening: () => void
}

export const UiContext = createContext<UiContextValue | null>(null)

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiContext')
  return ctx
}
