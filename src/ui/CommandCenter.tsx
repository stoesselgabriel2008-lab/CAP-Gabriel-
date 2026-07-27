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
  keywords?: string // synonymes et mots proches, séparés par des espaces
  run: () => void
}

/** Correspondance sur les synonymes : mots entiers, préfixes, inclusion (≥3 lettres). */
function keywordHit(query: string, keywords?: string): boolean {
  if (!keywords) return false
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = norm(query).trim()
  if (q.length < 2) return false
  return norm(keywords).split(/\s+/).some(w =>
    w.startsWith(q) || (q.length >= 3 && w.includes(q)) || (w.length >= 4 && q.includes(w))
  )
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
      { id: 'a-timer', group: 'Actions', title: 'Lancer un minuteur', icon: 'timer', keywords: 'timer chrono chronometre pomodoro session concentration travailler bosser etudier demarrer commencer 25 50 90', run: go(() => ui.openTimerStart()) },
      { id: 'a-capture', group: 'Actions', title: 'Capturer une idée ou une tâche', icon: 'capture', keywords: 'ajouter noter ecrire idee pense-bete memo rapide vite creer nouvelle', run: go(() => ui.openCapture()) },
      { id: 'a-checkin', group: 'Actions', title: 'Faire un check-in', icon: 'bolt', keywords: 'humeur energie forme etat moral fatigue stress bilan matin comment ca va', run: go(() => ui.openCheckIn()) },
      { id: 'a-sos', group: 'Actions', title: 'Lancer le SOS', icon: 'sos', keywords: 'envie craquer urgence crise aide pulsion tentation resister vague secours', run: go(() => ui.openSOS()) },
      { id: 'a-evening', group: 'Actions', title: 'Fermeture du soir', icon: 'moon', keywords: 'soir soiree coucher preparer demain routine nuit ranger fermer journee', run: go(() => ui.openEvening()) },
      { id: 'p-today', group: 'Pages', title: "Aujourd'hui", icon: 'today', keywords: 'accueil maintenant jour home top3 priorites', run: go(() => ui.navigate('today', null)) },
      { id: 'p-plan', group: 'Pages', title: 'Plan', icon: 'plan', keywords: 'taches tache todo a faire liste agenda organiser planifier calendrier', run: go(() => ui.navigate('plan', null)) },
      { id: 'p-inbox', group: 'Pages', title: 'Inbox', icon: 'inbox', keywords: 'trier boite vrac entrees clarifier ranger', run: go(() => ui.navigate('plan', 'inbox')) },
      { id: 'p-habits', group: 'Pages', title: 'Habitudes', icon: 'check', keywords: 'habitude routine streak serie regularite quotidien cocher suivre suivi', run: go(() => ui.navigate('plan', 'habits')) },
      { id: 'p-notes', group: 'Pages', title: 'Notes', icon: 'book', keywords: 'fiche memo note ecrit texte document idees', run: go(() => ui.navigate('plan', 'notes')) },
      { id: 'p-review', group: 'Pages', title: 'Révisions dues', icon: 'review', keywords: 'reviser revision apprendre etudier cours chapitre matiere memoriser par coeur qcm anki lecon examen', run: go(() => ui.navigate('review', null)) },
      { id: 'p-errors', group: 'Pages', title: "Journal d'erreurs", icon: 'flag', keywords: 'erreur faute correction rater trompe retest', run: go(() => ui.navigate('review', 'errors')) },
      { id: 'p-coach', group: 'Pages', title: 'Coach', icon: 'coach', keywords: 'soutien aide accompagnement conseils', run: go(() => ui.navigate('coach', null)) },
      { id: 'p-sleep', group: 'Pages', title: 'Sommeil', icon: 'moon', keywords: 'dormir dodo nuit coucher lit insomnie reveil fatigue sieste repos endormir', run: go(() => ui.navigate('coach', 'sleep')) },
      { id: 'p-control', group: 'Pages', title: 'Contrôle et engagement', icon: 'sos', keywords: 'compteur jours abstinence nofap rechute ecart declencheur serie si alors masturbation porno', run: go(() => ui.navigate('coach', 'control')) },
      { id: 'p-mental', group: 'Pages', title: 'Mental', icon: 'mind', keywords: 'stress anxiete angoisse respirer respiration calme meditation pensees journal emotions decision', run: go(() => ui.navigate('coach', 'mental')) },
      { id: 'p-body', group: 'Pages', title: 'Corps', icon: 'body', keywords: 'sport muscu musculation seance entrainement exercice courir marche physique', run: go(() => ui.navigate('coach', 'body')) },
      { id: 'p-social', group: 'Pages', title: 'Social', icon: 'social', keywords: 'parler filles amis timide timidite confiance aisance conversation rencontrer', run: go(() => ui.navigate('coach', 'social')) },
      { id: 'p-weekly', group: 'Pages', title: 'Revue hebdomadaire', icon: 'plan', keywords: 'bilan semaine dimanche hebdo recap retrospective', run: go(() => ui.navigate('me', 'weekly')) },
      { id: 'p-science', group: 'Pages', title: 'Science et mythes', icon: 'info', keywords: 'mythe dopamine preuve verite testosterone hormones vrai faux etudes', run: go(() => ui.navigate('me', 'science')) },
      { id: 'p-guide', group: 'Pages', title: 'Guide d\'utilisation', icon: 'book', keywords: 'aide tuto tutoriel comment mode emploi explication apprendre utiliser', run: go(() => ui.navigate('me', 'guide')) },
      { id: 'p-stats', group: 'Pages', title: 'Statistiques', icon: 'body', keywords: 'stats graphiques chiffres progression heatmap courbes donnees resultats', run: go(() => ui.navigate('me', 'stats')) },
      { id: 'p-data', group: 'Pages', title: 'Export / import des données', icon: 'export', keywords: 'sauvegarde backup export import transfert telecharger restaurer supprimer donnees', run: go(() => ui.navigate('me', 'data')) },
      { id: 'p-settings', group: 'Pages', title: 'Réglages', icon: 'settings', keywords: 'parametres settings options configuration preferences profil prenom date', run: go(() => ui.navigate('me', 'settings')) },
      { id: 'p-theme', group: 'Pages', title: 'Apparence · thème', icon: 'settings', keywords: 'theme couleur mode sombre clair verre glass style design nuit jour', run: go(() => ui.navigate('me', 'settings')) }
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
      ? commands.filter(c => fuzzyMatch(query, c.title + ' ' + (c.sub ?? '') + ' ' + c.group) || keywordHit(query, c.keywords))
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
