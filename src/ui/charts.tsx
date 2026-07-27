// Graphiques SVG maison : sobres, lisibles, sans dépendance.

import React from 'react'
import type { DayState } from '../domain/habits'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Barres verticales animées (elles se dessinent), coins arrondis, labels. */
export function BarChart({ data, height = 96, formatValue }: {
  data: Array<{ label: string; value: number | null; highlight?: boolean }>
  height?: number
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1e-6, ...data.map(d => d.value ?? 0))
  const barW = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} role="img"
      aria-label={data.map(d => `${d.label} : ${d.value === null ? 'aucune donnée' : (formatValue ? formatValue(d.value) : Math.round(d.value * 100) + ' %')}`).join(', ')}>
      {data.map((d, i) => {
        const chartH = height - 18
        const h = d.value === null ? 0 : Math.max(3, (d.value / max) * (chartH - 4))
        const x = i * barW + barW * 0.18
        const w = barW * 0.64
        return (
          <g key={i}>
            {d.value === null ? (
              <rect x={x} y={chartH - 3} width={w} height={3} rx={1.5} fill="var(--separator)" />
            ) : (
              <rect className="chart-bar" style={{ animationDelay: `${i * 45}ms` }}
                x={x} y={chartH - h} width={w} height={h} rx={Math.min(3, w / 2)}
                fill={d.highlight ? 'var(--tint)' : 'color-mix(in srgb, var(--tint) 55%, transparent)'} />
            )}
            <text x={i * barW + barW / 2} y={height - 4} textAnchor="middle"
              fontSize="7" fill="var(--secondary-label)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Barres horizontales animées (répartitions, top 5). */
export function HBarChart({ data, formatValue }: {
  data: Array<{ label: string; value: number }>
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1e-6, ...data.map(d => d.value))
  return (
    <div role="img" aria-label={data.map(d => `${d.label} : ${formatValue ? formatValue(d.value) : d.value}`).join(', ')}>
      {data.map((d, i) => (
        <div key={d.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ color: 'var(--secondary-label)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }}>
              {formatValue ? formatValue(d.value) : d.value}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--separator)', overflow: 'hidden' }}>
            <div className="chart-hbar" style={{
              width: `${(d.value / max) * 100}%`, height: '100%', borderRadius: 4,
              background: 'var(--tint)', animationDelay: `${i * 60}ms`
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Heatmap semaines × 7 jours (style contribution graph), intensité 0..1. */
export function Heatmap({ days, weeks = 26, color = 'var(--tint)' }: {
  days: Array<{ date: string; value: number | null }> // du plus ancien au plus récent
  weeks?: number
  color?: string
}) {
  const cols = weeks
  const cell = 100 / cols
  const height = 7 * (cell * 1.0)
  const active = days.filter(d => d.value !== null && d.value > 0).length
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%' }} role="img"
      aria-label={`${active} jours actifs sur les ${days.length} derniers jours`}>
      {days.map((d, i) => {
        const col = Math.floor(i / 7)
        const row = i % 7
        if (col >= cols) return null
        const v = d.value
        const fill = v === null || v === 0
          ? 'color-mix(in srgb, var(--separator) 45%, transparent)'
          : `color-mix(in srgb, ${color} ${Math.round(25 + Math.min(1, v) * 75)}%, transparent)`
        return (
          <rect key={d.date} className="chart-cell" style={{ animationDelay: `${col * 12}ms` }}
            x={col * cell + 0.6} y={row * cell + 0.6}
            width={cell - 1.2} height={cell - 1.2} rx={1.2} fill={fill} />
        )
      })}
    </svg>
  )
}

/** Grille des 28 derniers jours d'une habitude (4 semaines × 7). */
export function DayGrid({ days }: { days: Array<{ date: string; state: DayState }> }) {
  const cols = 7
  const size = 100 / cols
  const rows = Math.ceil(days.length / cols)
  const height = rows * 14
  const fill = (s: DayState) =>
    s === 'done' ? 'var(--success)'
      : s === 'missed' ? 'color-mix(in srgb, var(--danger) 55%, transparent)'
        : s === 'future' ? 'var(--separator)'
          : 'color-mix(in srgb, var(--separator) 40%, transparent)'
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height: rows * 18 }} role="img"
      aria-label={`${days.filter(d => d.state === 'done').length} jours faits sur ${days.filter(d => d.state !== 'off').length} prévus au cours des ${days.length} derniers jours`}>
      {days.map((d, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return (
          <rect key={d.date}
            x={col * size + 1.5} y={row * 14 + 1.5}
            width={size - 3} height={11} rx={3}
            fill={fill(d.state)} />
        )
      })}
    </svg>
  )
}

/** Anneau de progression (0..1) qui se remplit à l'affichage. */
export function ProgressRing({ value, size = 52, label }: { value: number; size?: number; label?: string }) {
  const r = 20
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const [drawn, setDrawn] = React.useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${Math.round(pct * 100)} %${label ? ' ' + label : ''}`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--separator)" strokeWidth="4" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={pct >= 0.8 ? 'var(--success)' : 'var(--tint)'} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={`${drawn ? c * pct : 0} ${c}`}
        style={{
          transition: 'stroke-dasharray 700ms cubic-bezier(0.32, 0.72, 0, 1)',
          filter: `drop-shadow(0 0 5px color-mix(in srgb, ${pct >= 0.8 ? 'var(--success)' : 'var(--tint)'} 45%, transparent))`
        }}
        transform="rotate(-90 24 24)" />
      <text x="24" y="27.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--label)">
        {Math.round(pct * 100)}
      </text>
    </svg>
  )
}

export { DAY_LETTERS }
