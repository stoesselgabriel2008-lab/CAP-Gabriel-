// Coach IA : chat avec Claude, personnalisé par les données du jour.
// Sans clé API : écran de configuration guidée. La clé reste sur l'appareil.

import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useUi } from '../app/ui-context'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { BackHeader } from './Plan'
import {
  AI_MODELS, getApiKey, setApiKey, getModel, setModel,
  loadChat, saveChat, clearChat, askCoach, errorMessage, type ChatMsg
} from '../ai/coach'

const SUGGESTIONS = [
  'Fais le point sur ma journée',
  'Aide-moi à organiser mes révisions',
  'Je lutte là — motive-moi',
  'Comment mieux dormir ce soir ?'
]

export function CoachAI() {
  const { state } = useApp()
  const ui = useUi()
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()))
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadChat())
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs, streaming])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setError('')
    setInput('')
    const history: ChatMsg[] = [...msgs, { role: 'user', text: trimmed }]
    setMsgs(history)
    setBusy(true)
    setStreaming('')
    try {
      const result = await askCoach(state, history, setStreaming)
      const answer: ChatMsg = {
        role: 'assistant',
        text: result.refused
          ? (result.text || 'Je préfère ne pas répondre à ça. Reformule, ou parle-m\'en autrement.')
          : result.text
      }
      const next = [...history, answer]
      setMsgs(next)
      saveChat(next)
    } catch (e) {
      setError(errorMessage(e))
      setMsgs(msgs) // retire le message non envoyé pour pouvoir réessayer
      setInput(trimmed)
    } finally {
      setBusy(false)
      setStreaming('')
    }
  }

  if (!hasKey) {
    return <AISetup onDone={() => setHasKey(true)} onBack={() => ui.setSub('coach', null)} />
  }

  return (
    <div className="screen ai-screen">
      <BackHeader title="Coach IA" onBack={() => ui.setSub('coach', null)}
        action="Réglages" onAction={() => setSettingsOpen(true)} />

      <div className="ai-chat">
        {msgs.length === 0 && !streaming && (
          <>
            <p className="ai-hello">
              Je connais ta journée — tâches, révisions, engagement — et je réponds
              en direct. Qu'est-ce qui t'aiderait, là ?
            </p>
            <div className="ai-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`ai-bubble ${m.role}`}>{m.text}</div>
        ))}
        {busy && (
          <div className="ai-bubble assistant">
            {streaming || <span className="ai-typing" aria-label="Le coach écrit"><span /><span /><span /></span>}
          </div>
        )}
        {error && <p className="ai-error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="ai-inputbar">
        <input
          className="field" value={input} placeholder="Écris au coach…"
          aria-label="Message au coach"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
        />
        <button className="action-bar-add" aria-label="Envoyer" disabled={busy || !input.trim()}
          onClick={() => send(input)} style={{ width: 40, height: 40 }}>
          <Icon name="up" size={20} />
        </button>
      </div>

      <p className="ai-privacy">
        Tes messages et un résumé de ta journée sont envoyés à Anthropic quand tu écris.
        Le reste de Cap reste 100 % sur ton téléphone.
      </p>

      {settingsOpen && (
        <AISettings
          onClose={() => setSettingsOpen(false)}
          onKeyRemoved={() => { setSettingsOpen(false); setHasKey(false) }}
          onNewChat={() => { clearChat(); setMsgs([]); setSettingsOpen(false) }}
        />
      )}
    </div>
  )
}

function AISetup({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [key, setKey] = useState('')
  return (
    <div className="screen">
      <BackHeader title="Coach IA" onBack={onBack} />
      <p className="subtitle-context" style={{ marginTop: 4 }}>
        Un coach personnel propulsé par Claude, qui connaît ta journée.
        Il faut une clé API Anthropic — elle reste sur ton téléphone.
      </p>

      <div className="list-group">
        {[
          ['1', 'Va sur console.anthropic.com et crée un compte (18 ans requis — à faire avec tes parents)'],
          ['2', 'Ajoute quelques euros de crédits (Billing) — une conversation coûte quelques centimes'],
          ['3', 'Crée une clé dans « API Keys » et copie-la'],
          ['4', 'Colle-la ci-dessous — elle n\'est jamais incluse dans tes exports']
        ].map(([n, t]) => (
          <div key={n} className="list-row">
            <span className="check-circle" style={{ borderColor: 'var(--tint)', color: 'var(--tint)', fontSize: 13, fontWeight: 700 }}>{n}</span>
            <span className="row-main"><span className="row-title" style={{ fontSize: 15, whiteSpace: 'normal' }}>{t}</span></span>
          </div>
        ))}
      </div>

      <label className="field-label" htmlFor="ai-key">Clé API</label>
      <input id="ai-key" className="field" type="password" value={key}
        placeholder="sk-ant-…" autoComplete="off"
        onChange={e => setKey(e.target.value)} />
      <button className="btn btn-primary btn-block btn-large" style={{ marginTop: 16 }}
        disabled={!key.trim().startsWith('sk-ant-')}
        onClick={() => { setApiKey(key.trim()); onDone() }}>
        Activer le Coach IA
      </button>
      <p style={{ color: 'var(--tertiary-label)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
        En l'activant, tes messages au coach et un résumé de tes données du jour
        seront envoyés à Anthropic à chaque conversation. Tout le reste de Cap
        reste hors ligne, sans compte.
      </p>
    </div>
  )
}

function AISettings({ onClose, onKeyRemoved, onNewChat }: {
  onClose: () => void
  onKeyRemoved: () => void
  onNewChat: () => void
}) {
  const [model, setModelState] = useState(getModel())
  return (
    <Sheet title="Réglages du coach" onClose={onClose}>
      <span className="field-label">Modèle</span>
      <div className="list-group">
        {AI_MODELS.map(m => (
          <button key={m.id} className="list-row" aria-pressed={model === m.id}
            onClick={() => { setModel(m.id); setModelState(m.id) }}>
            <span className={`check-circle${model === m.id ? ' checked' : ''}`}><Icon name="check" size={14} /></span>
            <span className="row-main">
              <span className="row-title">{m.label}</span>
              <span className="row-sub">{m.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={onNewChat}>
        Nouvelle conversation
      </button>
      <button className="btn-plain btn-block" style={{ minHeight: 44, marginTop: 8, color: 'var(--danger)' }}
        onClick={() => { setApiKey(''); clearChat(); onKeyRemoved() }}>
        Retirer la clé et effacer la conversation
      </button>
    </Sheet>
  )
}
