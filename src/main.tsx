import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { AppProvider } from './state/store'
import './styles/app.css'
import { registerSW } from 'virtual:pwa-register'

// Service worker : mise à jour contrôlée, pas de boucle de cache.
// La proposition de rechargement passe par une bannière intégrée (pas d'alerte système).
const updateSW = registerSW({
  onNeedRefresh() {
    ;(window as any).__capApplyUpdate = () => updateSW(true)
    window.dispatchEvent(new CustomEvent('cap-update-available'))
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
