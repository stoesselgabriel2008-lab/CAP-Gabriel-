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
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
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
  }, [onClose])

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`sheet${full ? ' sheet-full' : ''}`}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-header">
          <span className="sheet-title">{title}</span>
          <button className="btn-plain-bold sheet-close" onClick={onClose} style={{ minHeight: 44, minWidth: 44 }}>
            {closeLabel}
          </button>
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
  return (
    <div className="segmented" role="group" aria-label={label}>
      {idx >= 0 && (
        <span
          className="segmented-thumb"
          aria-hidden="true"
          style={{ width: `calc((100% - 4px) / ${n})`, transform: `translateX(${idx * 100}%)` }}
        />
      )}
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
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
