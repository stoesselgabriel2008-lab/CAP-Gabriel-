// Set d'icônes SVG original : trait 1.8, extrémités arrondies, grille 24px.

import React from 'react'

const PATHS: Record<string, React.ReactNode> = {
  today: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" /></>,
  plan: <><rect x="3.5" y="4.5" width="17" height="16" rx="3" /><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4M7.5 13.5h4M7.5 17h6.5" /></>,
  review: <><path d="M12 5.6C10.2 4.1 7.7 3.5 4.5 3.5v14.4c3.2 0 5.7.6 7.5 2.1 1.8-1.5 4.3-2.1 7.5-2.1V3.5c-3.2 0-5.7.6-7.5 2.1Z" /><path d="M12 5.6V20" /></>,
  coach: <><path d="M12 20.5s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10Z" /></>,
  me: <><circle cx="12" cy="8.2" r="3.7" /><path d="M4.8 20.2c.8-3.6 3.8-5.6 7.2-5.6s6.4 2 7.2 5.6" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 5 5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevronRight: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  chevronLeft: <path d="m15 5.5-6.5 6.5L15 18.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  timer: <><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 2M9.5 2.5h5" /></>,
  sos: <><path d="M12 3 4.5 6.2v5.2c0 4.6 3.2 7.8 7.5 9.4 4.3-1.6 7.5-4.8 7.5-9.4V6.2L12 3Z" /><path d="M12 8.5v4.5M12 16.2v.1" /></>,
  capture: <><path d="M4 13.5V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3.5" /><path d="M4 13.5h4.5c.4 1.5 1.7 2.5 3.5 2.5s3.1-1 3.5-2.5H20M12 4v7M9 8.5 12 11l3-2.5" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  mind: <><path d="M12 3.5a6.5 6.5 0 0 1 6.5 6.5c0 2-1 3.4-2 4.8-.7 1-.9 2.2-.9 3.2H8.4c0-1-.2-2.2-.9-3.2-1-1.4-2-2.8-2-4.8A6.5 6.5 0 0 1 12 3.5Z" /><path d="M9.5 21h5" /></>,
  body: <><path d="M4 12h2.5l2-4.5 3 9 2.5-6.5 1.5 2H20" /></>,
  social: <><path d="M8 15.5H6a3.5 3.5 0 0 1-3.5-3.5V7A3.5 3.5 0 0 1 6 3.5h8A3.5 3.5 0 0 1 17.5 7v1" /><path d="M10.5 20.5H18a3.5 3.5 0 0 0 3.5-3.5v-3A3.5 3.5 0 0 0 18 10.5h-4a3.5 3.5 0 0 0-3.5 3.5v6.5Z" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.4m0 13.6v2.4M4 12H2.8m18.4 0H20M5.4 5.4l1.7 1.7m9.8 9.8 1.7 1.7m0-13.2-1.7 1.7M7.1 16.9l-1.7 1.7" /></>,
  export: <><path d="M12 15V4M8 7.5 12 3.5l4 4" /><path d="M4.5 13v5a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-5" /></>,
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10-6.5L8 5.5Z" />,
  trash: <><path d="M4.5 6.5h15M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M6.5 6.5l.8 12.1a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12.1" /><path d="M10 10.5v6M14 10.5v6" /></>,
  inbox: <><path d="M4 13.5V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3.5" /><path d="M4 13.5h4.5c.4 1.5 1.7 2.5 3.5 2.5s3.1-1 3.5-2.5H20L17.5 5.8A2 2 0 0 0 15.6 4.5H8.4a2 2 0 0 0-1.9 1.3L4 13.5Z" /></>,
  flag: <path d="M6 21V4.5M6 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0V13c-2 1.3-4 1.3-6 0s-4-1.3-6 0" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.8v.1" /></>,
  book: <><path d="M5 4.5A2 2 0 0 1 7 2.5h12v17H7a2 2 0 0 0-2 2v-17Z" /><path d="M5 19.5a2 2 0 0 1 2-2h12" /></>,
  bolt: <path d="M13 2.5 5 13.5h5.5L11 21.5l8-11h-5.5L13 2.5Z" />,
  wave: <path d="M2.5 15c2.5 0 2.5-6 5-6s2.5 6 5 6 2.5-6 5-6 2.5 6 4 6" />,
  bell: <><path d="M12 3.5a5.5 5.5 0 0 1 5.5 5.5c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5A5.5 5.5 0 0 1 12 3.5ZM10 18.5a2 2 0 0 0 4 0" /></>,
  drag: <path d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" />,
  up: <path d="m6 14 6-6 6 6" />,
  down: <path d="m6 10 6 6 6-6" />
}

export function Icon({ name, size = 22, className, filled }: {
  name: keyof typeof PATHS | string
  size?: number
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}
    >
      {PATHS[name] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}

/** Pastille d'icône colorée façon Réglages iOS (fond plein, icône blanche). */
export function IconChip({ name, color, size = 29 }: {
  name: keyof typeof PATHS | string
  color: string
  size?: number
}) {
  return (
    <span className="icon-chip" style={{ background: color, width: size, height: size }} aria-hidden="true">
      <Icon name={name} size={Math.round(size * 0.6)} />
    </span>
  )
}
