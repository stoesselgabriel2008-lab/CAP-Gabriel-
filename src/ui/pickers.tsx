// Sélecteurs de date et d'heure intégrés — remplacent les popups natifs iOS
// par des cartes en verre cohérentes avec le reste de l'app.

import React, { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { todayISO, addDays, isoWeekday, formatCivilLong, isValidCivil } from '../lib/dates'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const pad = (n: number) => String(n).padStart(2, '0')

/** Champ date : bouton stylé + calendrier en sheet. value '' = aucune. */
export function DateField({ label, value, onChange, allowNone = true, quick = true }: {
  label: string
  value: string
  onChange: (v: string) => void
  allowNone?: boolean
  quick?: boolean
}) {
  const [open, setOpen] = useState(false)
  const today = todayISO()
  const display = value && isValidCivil(value) ? formatCivilLong(value) : allowNone ? 'Aucune' : 'Choisir…'
  // titre court pour l'en-tête de la sheet (le libellé long écrasait le bouton Fermer)
  const sheetTitle = label.split(' — ')[0].split(' (')[0]

  const nextMonday = (() => {
    const wd = isoWeekday(today)
    return addDays(today, wd === 7 ? 1 : 8 - wd)
  })()

  const pick = (v: string) => { onChange(v); setOpen(false) }

  return (
    <>
      <span className="field-label" aria-hidden="true">{label}</span>
      <button type="button" className="field picker-field" aria-label={`${label} : ${display}`} onClick={() => setOpen(true)}>
        <span style={{ color: value ? 'var(--label)' : 'var(--tertiary-label)' }}>{display}</span>
        <Icon name="plan" size={18} className="chevron" />
      </button>
      {open && (
        <Sheet title={sheetTitle} onClose={() => setOpen(false)}>
          {quick && (
            <div className="chip-row" style={{ marginBottom: 16 }}>
              <button type="button" className="chip" aria-pressed={value === today} onClick={() => pick(today)}>Aujourd'hui</button>
              <button type="button" className="chip" aria-pressed={value === addDays(today, 1)} onClick={() => pick(addDays(today, 1))}>Demain</button>
              <button type="button" className="chip" aria-pressed={value === nextMonday} onClick={() => pick(nextMonday)}>Lundi prochain</button>
            </div>
          )}
          <MonthCalendar value={value && isValidCivil(value) ? value : null} onPick={pick} />
          {allowNone && value && (
            <button type="button" className="btn-plain btn-block" style={{ minHeight: 44, marginTop: 8 }}
              onClick={() => pick('')}>
              Effacer la date
            </button>
          )}
        </Sheet>
      )}
    </>
  )
}

export function MonthCalendar({ value, onPick }: {
  value: string | null
  onPick: (d: string) => void
}) {
  const today = todayISO()
  const [ym, setYm] = useState(() => (value ?? today).slice(0, 7))
  const [y, m] = ym.split('-').map(Number)
  const daysCount = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const firstWd = isoWeekday(`${ym}-01`)
  const cells: Array<number | null> = [
    ...Array(firstWd - 1).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1)
  ]
  const shift = (months: number) => {
    const d = new Date(Date.UTC(y, m - 1 + months, 1))
    setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" aria-label="Année précédente" onClick={() => shift(-12)}>
          <Icon name="chevronLeft" size={14} /><Icon name="chevronLeft" size={14} />
        </button>
        <button type="button" aria-label="Mois précédent" onClick={() => shift(-1)}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="cal-title">{MONTHS[m - 1]} {y}</span>
        <button type="button" aria-label="Mois suivant" onClick={() => shift(1)}>
          <Icon name="chevronRight" size={18} />
        </button>
        <button type="button" aria-label="Année suivante" onClick={() => shift(12)}>
          <Icon name="chevronRight" size={14} /><Icon name="chevronRight" size={14} />
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {DOW.map((d, i) => <span key={i} className="cal-dow" aria-hidden="true">{d}</span>)}
        {cells.map((day, i) => day === null
          ? <span key={`e${i}`} />
          : (() => {
            const iso = `${ym}-${pad(day)}`
            const isSel = value === iso
            const isToday = today === iso
            return (
              <button
                key={iso} type="button"
                className={`cal-day${isSel ? ' selected' : ''}${isToday ? ' today' : ''}`}
                aria-pressed={isSel}
                aria-label={formatCivilLong(iso)}
                onClick={() => onPick(iso)}
              >
                {day}
              </button>
            )
          })()
        )}
      </div>
    </div>
  )
}

const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

/** Champ heure : bouton stylé + grille heures/minutes en sheet. value '' = aucune. */
export function TimeField({ label, value, onChange, allowNone = true }: {
  label: string
  value: string
  onChange: (v: string) => void
  allowNone?: boolean
}) {
  const [open, setOpen] = useState(false)
  const valid = /^\d{2}:\d{2}$/.test(value)
  const [h, mn] = valid ? value.split(':') : ['07', '00']

  const setH = (nh: string) => onChange(`${nh}:${valid ? mn : '00'}`)
  const setM = (nm: string) => onChange(`${valid ? h : '07'}:${nm}`)

  return (
    <>
      <span className="field-label" aria-hidden="true">{label}</span>
      <button type="button" className="field picker-field"
        aria-label={`${label} : ${valid ? value : 'aucune'}`} onClick={() => setOpen(true)}>
        <span style={{ color: valid ? 'var(--label)' : 'var(--tertiary-label)', fontVariantNumeric: 'tabular-nums' }}>
          {valid ? value : allowNone ? 'Aucune' : 'Choisir…'}
        </span>
        <Icon name="timer" size={18} className="chevron" />
      </button>
      {open && (
        <Sheet title={label.split(' — ')[0].split(' (')[0]} onClose={() => setOpen(false)} closeLabel="OK">
          <p className="time-preview" aria-live="polite">{valid ? `${h}:${mn}` : '—'}</p>
          <span className="field-label">Heure</span>
          <div className="time-grid" role="group" aria-label="Heure">
            {Array.from({ length: 24 }, (_, i) => pad(i)).map(hh => (
              <button key={hh} type="button" className="chip time-chip" aria-pressed={valid && h === hh}
                onClick={() => setH(hh)}>
                {hh}
              </button>
            ))}
          </div>
          <span className="field-label">Minutes</span>
          <div className="time-grid" role="group" aria-label="Minutes">
            {MINUTES.map(mm => (
              <button key={mm} type="button" className="chip time-chip" aria-pressed={valid && mn === mm}
                onClick={() => setM(mm)}>
                {mm}
              </button>
            ))}
          </div>
          {allowNone && valid && (
            <button type="button" className="btn-plain btn-block" style={{ minHeight: 44, marginTop: 12 }}
              onClick={() => { onChange(''); setOpen(false) }}>
              Effacer l'heure
            </button>
          )}
          <button type="button" className="btn btn-primary btn-block btn-large" style={{ marginTop: 12 }}
            onClick={() => setOpen(false)}>
            OK
          </button>
        </Sheet>
      )}
    </>
  )
}
