import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path pour GitHub Pages : https://<user>.github.io/CAP-Gabriel-/
// (la casse doit correspondre exactement au nom du dépôt — Pages est sensible à la casse).
// Surchargez avec VITE_BASE=/ pour un domaine racine.
const base = process.env.VITE_BASE ?? '/CAP-Gabriel-/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'Cap Gabriel',
        short_name: 'Cap',
        description: 'Cockpit personnel : révisions, focus, sommeil, engagement.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
} as any)
