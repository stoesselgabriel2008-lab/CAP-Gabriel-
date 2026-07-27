// Bottom sheet accessible : dialog modal, piège de focus, fermeture par
// Escape, backdrop, bouton visible (jamais un geste seul), retour du focus.

import React, { useEffect, useRef } from 'react'

// Pile des sheets ouvertes : seule celle du dessus réagit à Escape/Tab,
// et le scroll du fond n'est restauré que quand la dernière se ferme.
const sheetStack: symbol[] = []

export function Sheet({ title, onClose, children, full, closeLabel = 'Fermer' }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  full?: boolean
  closeLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // onClose change d'identité à chaque render du parent : passer par une ref
  // pour que l'effet d'ouverture ne se rejoue JAMAIS (sinon il re-focalisait
  // le premier champ — le titre — dès que le parent re-rendait).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const token = Symbol('sheet')
    sheetStack.push(token)
    const isTop = () => sheetStack[sheetStack.length - 1] === token
    previouslyFocused.current = document.activeElement as HTMLElement
    const el = ref.current
    if (el) {
      const focusable = el.querySelector<HTMLElement>(
        'input, textarea, select, button:not(.sheet-close), [tabindex]'
      )
      ;(focusable ?? el).focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current() }
      if (e.key === 'Tab' && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(x => x.offsetParent !== null)
        if (items.length === 0) return
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, true)
      const i = sheetStack.indexOf(token)
      if (i >= 0) sheetStack.splice(i, 1)
      if (sheetStack.length === 0) document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [])

  // Remontée au-dessus du clavier, mesurée sur la sheet elle-même
  // (getBoundingClientRect vs visualViewport). Deux garde-fous contre les
  // sauts : on ne remonte que si un champ de CETTE sheet est focalisé
  // (une sheet empilée sans champ ne bouge jamais), et on ne mesure
  // jamais pendant une animation (ouverture, transition) — la position
  // serait fausse et la sheet partait « dans tous les sens ».
  const [lift, setLift] = React.useState(0)
  const liftRef = useRef(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let timers: number[] = []
    const clear = () => { timers.forEach(t => window.clearTimeout(t)); timers = [] }
    const later = (ms: number) => { timers.push(window.setTimeout(measure, ms)) }
    const measure = () => {
      const el = ref.current
      if (!el) return
      if (el.getAnimations?.().some(a => a.playState === 'running')) { later(140); return }
      const ae = document.activeElement
      const editing = ae instanceof HTMLElement && el.contains(ae) && ae.matches('input, textarea, select')
      let next = 0
      if (editing) {
        const kbTop = vv.offsetTop + vv.height // haut du clavier, coordonnées layout
        const naturalBottom = el.getBoundingClientRect().bottom + liftRef.current
        const needed = Math.max(0, naturalBottom - kbTop + 10)
        next = needed > 24 ? Math.round(needed) : 0
      }
      if (Math.abs(next - liftRef.current) > 8) { liftRef.current = next; setLift(next) }
    }
    const onChange = () => { clear(); measure(); later(450) }
    // au blur, attendre : le focus peut passer à un autre champ juste après
    const onFocusOut = () => { clear(); later(120); later(500) }
    const el = ref.current
    onChange()
    vv.addEventListener('resize', onChange)
    vv.addEventListener('scroll', onChange)
    el?.addEventListener('focusin', onChange)
    el?.addEventListener('focusout', onFocusOut)
    return () => {
      clear()
      vv.removeEventListener('resize', onChange)
      vv.removeEventListener('scroll', onChange)
      el?.removeEventListener('focusin', onChange)
      el?.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // Champ focalisé recentré dans la zone scrollable (clavier ouvert)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t.matches?.('input, textarea, select')) {
        setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260)
      }
    }
    el.addEventListener('focusin', onFocus)
    return () => el.removeEventListener('focusin', onFocus)
  }, [])

  // Fermeture en tirant la sheet vers le bas (depuis la poignée / l'en-tête)
  const [dy, setDy] = React.useState(0)
  const dragging = useRef<{ startY: number } | null>(null)
  const onHeadDown = (e: React.PointerEvent) => {
    // ne pas voler le clic des boutons du header (Fermer, OK…)
    if ((e.target as Element).closest('button')) return
    dragging.current = { startY: e.clientY }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onHeadMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setDy(Math.max(0, e.clientY - dragging.current.startY))
  }
  const onHeadUp = () => {
    if (!dragging.current) return
    const closing = dy > 110
    dragging.current = null
    if (closing) onClose()
    else setDy(0)
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true"
        style={dy > 0 ? { opacity: Math.max(0.3, 1 - dy / 400) } : undefined} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`sheet${full ? ' sheet-full' : ''}`}
        style={{
          transform: dy - lift !== 0 ? `translateY(${dy - lift}px)` : undefined,
          maxHeight: lift > 0 ? `calc(100dvh - var(--sat) - ${40 + lift}px)` : undefined,
          transition: dragging.current
            ? 'none'
            : 'transform 280ms var(--ease-spring), max-height 250ms var(--ease-spring)'
        }}
      >
        <div
          className="sheet-drag-zone"
          onPointerDown={onHeadDown}
          onPointerMove={onHeadMove}
          onPointerUp={onHeadUp}
          onPointerCancel={onHeadUp}
        >
          <div className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-header">
            <span className="sheet-title">{title}</span>
            <button className="btn-plain-bold sheet-close" onClick={onClose} style={{ minHeight: 44, minWidth: 44 }}>
              {closeLabel}
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: Array<{ value: T; label: string }>
  value: T | null
  onChange: (v: T) => void
  label: string
}) {
  const idx = options.findIndex(o => o.value === value)
  const n = options.length
  const box = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<number | null>(null) // index fractionnaire pendant le glissement
  const moved = useRef(false)

  const fracFor = (clientX: number) => {
    const r = box.current!.getBoundingClientRect()
    const f = ((clientX - r.left - 2) / Math.max(1, r.width - 4)) * n - 0.5
    return Math.max(0, Math.min(n - 1, f))
  }
  const startX = useRef(0)
  const onDown = (e: React.PointerEvent) => {
    moved.current = false
    startX.current = e.clientX
  }
  const onMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return // survol : jamais de glissement sans appui
    // seuil de 8 px : un tap simple ne déclenche pas le mode glissement
    if (!moved.current && Math.abs(e.clientX - startX.current) < 8) return
    if (!moved.current) {
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    }
    moved.current = true
    const f = fracFor(e.clientX)
    setDrag(f)
    // application en temps réel : la valeur change pendant le glissement
    const target = options[Math.round(f)]
    if (target && target.value !== value) onChange(target.value)
  }
  const onUp = () => {
    if (drag === null) return
    const target = options[Math.round(drag)]
    setDrag(null)
    if (target && target.value !== value) onChange(target.value)
  }

  const shown = drag ?? (idx >= 0 ? idx : null)
  return (
    <div
      ref={box}
      className="segmented"
      role="group"
      aria-label={label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
    >
      {shown !== null && (
        <span
          className="segmented-thumb"
          aria-hidden="true"
          style={{
            width: `calc((100% - 4px) / ${n})`,
            transform: `translateX(${shown * 100}%)`,
            transition: drag !== null ? 'none' : undefined
          }}
        />
      )}
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => { if (!moved.current) onChange(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Sélecteur en pastilles — remplace les <select> natifs (popup iOS peu soigné). */
export function ChoiceChips<T extends string>({ options, value, onChange, label, allowNone }: {
  options: Array<{ value: T; label: string }>
  value: T | '' | null
  onChange: (v: T | '') => void
  label: string
  allowNone?: string // libellé de l'option "aucun"
}) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {allowNone !== undefined && (
        <button type="button" className="chip" aria-pressed={!value}
          onClick={() => onChange('')}>
          {allowNone}
        </button>
      )}
      {options.map(o => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value && allowNone !== undefined ? '' : o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {children}
    </div>
  )
}

export function SectionHeader({ children, action, onAction }: {
  children: React.ReactNode
  action?: string
  onAction?: () => void
}) {
  return (
    <h2 className="section-header">
      <span>{children}</span>
      {action && <button className="section-action" onClick={onAction}>{action}</button>}
    </h2>
  )
}
