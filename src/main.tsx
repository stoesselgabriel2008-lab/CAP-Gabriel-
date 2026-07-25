import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { AppProvider } from './state/store'
import './styles/app.css'
import { registerSW } from 'virtual:pwa-register'

// Service worker : mise à jour contrôlée, pas de boucle de cache.
const updateSW = registerSW({
  onNeedRefresh() {
    // simple et honnête : proposer le rechargement via confirm natif
    if (window.confirm('Une nouvelle version de Cap est disponible. Recharger maintenant ?')) {
      updateSW(true)
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
