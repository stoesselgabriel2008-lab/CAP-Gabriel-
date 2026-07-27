// Centre de commande : recherche floue locale sur pages, actions, tâches,
// chapitres, projets, notes et erreurs. Résultats groupés par type.

import React, { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'

interface Cmd {
  id: string
  group: string
  title: string
  sub?: string
  icon: string
  run: () => void
}

/** Correspondance floue simple : sous-séquence insensible aux accents/casse. */
export function fuzzyMatch(query: string, target: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = norm(query), t = norm(target)
  if (!q) return true
  if (t.includes(q)) return true
  let i = 0
  for (const ch of t) { if (ch === q[i]) i++; if (i === q.length) return true }
  return i === q.length
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const idx = norm(text).indexOf(norm(query))
  if (idx < 0) return text
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
}

export function CommandCenter({ onClose }: { onClose: () => void }) {
  const { state } = useApp()
  const ui = useUi()
  const [query, setQuery] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Plein écran ancré en haut : le clavier ne déplace jamais le champ.
  React.useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const commands = useMemo<Cmd[]>(() => {
    const go = (fn: () => void) => () => { onClose(); fn() }
    const list: Cmd[] = [
      { id: 'a-timer', group: 'Actions', title: 'Lancer un minuteur', icon: 'timer', run: go(() => ui.openTimerStart()) },
      { id: 'a-capture', group: 'Actions', title: 'Capturer une idée ou une tâche', icon: 'capture', run: go(() => ui.openCapture()) },
      { id: 'a-checkin', group: 'Actions', title: 'Faire un check-in', icon: 'bolt', run: go(() => ui.openCheckIn()) },
      { id: 'a-sos', group: 'Actions', title: 'Lancer le SOS', icon: 'sos', run: go(() => ui.openSOS()) },
      { id: 'a-evening', group: 'Actions', title: 'Fermeture du soir', icon: 'moon', run: go(() => ui.openEvening()) },
      { id: 'p-today', group: 'Pages', title: "Aujourd'hui", icon: 'today', run: go(() => ui.navigate('today', null)) },
      { id: 'p-plan', group: 'Pages', title: 'Plan', icon: 'plan', run: go(() => ui.navigate('plan', null)) },
      { id: 'p-inbox', group: 'Pages', title: 'Inbox', icon: 'inbox', run: go(() => ui.navigate('plan', 'inbox')) },
      { id: 'p-habits', group: 'Pages', title: 'Habitudes', icon: 'check', run: go(() => ui.navigate('plan', 'habits')) },
      { id: 'p-notes', group: 'Pages', title: 'Notes', icon: 'book', run: go(() => ui.navigate('plan', 'notes')) },
      { id: 'p-review', group: 'Pages', title: 'Révisions dues', icon: 'review', run: go(() => ui.navigate('review', null)) },
      { id: 'p-errors', group: 'Pages', title: "Journal d'erreurs", icon: 'flag', run: go(() => ui.navigate('review', 'errors')) },
      { id: 'p-coach', group: 'Pages', title: 'Coach', icon: 'coach', run: go(() => ui.navigate('coach', null)) },
      { id: 'p-sleep', group: 'Pages', title: 'Sommeil', icon: 'moon', run: go(() => ui.navigate('coach', 'sleep')) },
      { id: 'p-control', group: 'Pages', title: 'Contrôle et engagement', icon: 'sos', run: go(() => ui.navigate('coach', 'control')) },
      { id: 'p-weekly', group: 'Pages', title: 'Revue hebdomadaire', icon: 'plan', run: go(() => ui.navigate('me', 'weekly')) },
      { id: 'p-science', group: 'Pages', title: 'Science et mythes', icon: 'info', run: go(() => ui.navigate('me', 'science')) },
      { id: 'p-guide', group: 'Pages', title: 'Guide d\'utilisation', icon: 'book', run: go(() => ui.navigate('me', 'guide')) },
      { id: 'p-stats', group: 'Pages', title: 'Statistiques', icon: 'body', run: go(() => ui.navigate('me', 'stats')) },
      { id: 'p-data', group: 'Pages', title: 'Export / import des données', icon: 'export', run: go(() => ui.navigate('me', 'data')) },
      { id: 'p-settings', group: 'Pages', title: 'Réglages', icon: 'settings', run: go(() => ui.navigate('me', 'settings')) },
      { id: 'p-theme', group: 'Pages', title: 'Apparence · thème (sombre, clair, verre)', icon: 'settings', run: go(() => ui.navigate('me', 'settings')) },
      { id: 'p-profile', group: 'Pages', title: 'Modifier mon profil (prénom, dates)', icon: 'me', run: go(() => ui.navigate('me', 'settings')) }
    ]
    for (const t of state.tasks.filter(t => !t.done && !t.deletedAt).slice(-60)) {
      list.push({ id: `t-${t.id}`, group: 'Tâches', title: t.title, sub: t.plannedDate ?? undefined, icon: 'check', run: go(() => ui.navigate('plan', null)) })
    }
    for (const u of state.studyUnits.filter(u => !u.archived)) {
      const subj = state.subjects.find(s => s.id === u.subjectId)
      list.push({ id: `u-${u.id}`, group: 'Chapitres', title: u.name, sub: subj?.name, icon: 'book', run: go(() => ui.navigate('review', `subject:${u.subjectId}`)) })
    }
    for (const p of state.projects.filter(p => p.status === 'actif')) {
      list.push({ id: `pr-${p.id}`, group: 'Projets', title: p.name, icon: 'flag', run: go(() => ui.navigate('plan', 'projects')) })
    }
    for (const c of state.captures.filter(c => !c.processedAt).slice(-30)) {
      list.push({ id: `c-${c.id}`, group: 'Inbox', title: c.text.slice(0, 60), icon: 'inbox', run: go(() => ui.navigate('plan', 'inbox')) })
    }
    for (const e of state.errorLogs.filter(e => !e.retested).slice(-30)) {
      list.push({ id: `e-${e.id}`, group: 'Erreurs', title: e.error.slice(0, 60), icon: 'flag', run: go(() => ui.navigate('review', 'errors')) })
    }
    for (const n of state.notes.filter(n => !n.deletedAt).slice(-40)) {
      list.push({ id: `n-${n.id}`, group: 'Notes', title: n.title || n.body.slice(0, 50) || 'Sans titre', icon: 'book', run: go(() => ui.navigate('plan', 'notes')) })
    }
    for (const r of state.routines.filter(r => !r.archived)) {
      list.push({ id: `h-${r.id}`, group: 'Habitudes', title: r.name, icon: 'check', run: go(() => ui.navigate('plan', 'habits')) })
    }
    return list
  }, [state, ui, onClose])

  const results = useMemo(() => {
    const filtered = query
      ? commands.filter(c => fuzzyMatch(query, c.title + ' ' + (c.sub ?? '') + ' ' + c.group))
      : commands.filter(c => c.group === 'Actions' || c.group === 'Pages')
    const groups = new Map<string, Cmd[]>()
    for (const c of filtered) {
      if (!groups.has(c.group)) groups.set(c.group, [])
      if (groups.get(c.group)!.length < 8) groups.get(c.group)!.push(c)
    }
    return groups
  }, [commands, query])

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Rechercher ou agir">
      <div className="search-head">
        <div className="search-field-wrap">
          <Icon name="search" size={18} className="chevron" />
          <input
            ref={inputRef} type="search"
            placeholder="Tâche, chapitre, page, action…"
            value={query} onChange={e => setQuery(e.target.value)}
            aria-label="Recherche"
          />
        </div>
        <button className="btn-plain-bold" style={{ minHeight: 44 }} onClick={onClose}>Annuler</button>
      </div>
      <div className="search-results cmd-results">
        {results.size === 0 && (
          <p className="empty-state">Aucun résultat pour « {query} ».</p>
        )}
        {[...results.entries()].map(([group, cmds]) => (
          <div key={group}>
            <div className="cmd-group-label">{group}</div>
            <div className="list-group">
              {cmds.map(c => (
                <button key={c.id} className="list-row" onClick={c.run}>
                  <Icon name={c.icon} size={20} className="chevron" />
                  <span className="row-main">
                    <span className="row-title">{highlight(c.title, query)}</span>
                    {c.sub && <span className="row-sub">{c.sub}</span>}
                  </span>
                  <Icon name="chevronRight" size={16} className="chevron" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
