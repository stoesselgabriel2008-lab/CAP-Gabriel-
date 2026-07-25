# Cap — Gabriel

PWA personnelle : cockpit quotidien, planificateur, coach de révision (Méthode des J),
minuteurs de focus, SOS anti-envie, sommeil, journal et engagement personnel.
Entièrement en français, optimisée iPhone/Safari, installable sur l'écran d'accueil,
utilisable hors ligne, données 100 % locales (IndexedDB) — aucun compte, aucun serveur,
aucun tracker.

## Démarrage

```bash
npm install
npm run dev        # développement
npm test           # tests unitaires (vitest)
npm run build      # typecheck + build de production (dist/)
npm run preview    # sert dist/ sur http://localhost:4173/CAP-Gabriel-/
node scripts/qa.mjs  # QA automatisée : parcours complets + captures (qa-shots/)
```

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` construit et publie `dist/` sur GitHub Pages
à chaque push sur `main` (ou la branche de travail).

**Activation à faire une fois** : dépôt GitHub → Settings → Pages → Source :
**GitHub Actions**. L'app sera servie sur
`https://<utilisateur>.github.io/CAP-Gabriel-/`.

Le chemin de base est `/CAP-Gabriel-/` (voir `vite.config.ts`). Pour un autre
hébergement, surcharger : `VITE_BASE=/ npm run build`.

## Installation iPhone

1. Ouvrir l'URL dans **Safari**
2. Bouton **Partager** → **Sur l'écran d'accueil**
3. Cap s'ouvre alors en plein écran (mode standalone), hors ligne inclus

## Architecture

- `src/lib/` — dates civiles Europe/Paris (DST-safe), IDs
- `src/domain/` — types, Méthode des J (`srs.ts`), série d'engagement (`streak.ts`),
  minuteur à timestamps (`timer.ts`), moteur de recommandation (`recommend.ts`),
  export/import validé (`backup.ts`), insights à seuil (`insights.ts`)
- `src/storage/` — persistance IndexedDB (document unique transactionnel + copie de secours)
- `src/state/` — store React (mutations, annulation, toasts)
- `src/views/` — les cinq onglets
- `src/ui/` — sheets, SOS, minuteur, capture, centre de commande, onboarding
- `tests/` — 41 tests unitaires (dates, DST, bissextile, SRS, minuteur, backup, recommandation)

## Limites honnêtes (PWA)

- Pas de blocage d'autres apps (utiliser Temps d'écran iOS)
- Pas de notifications programmées fiables en arrière-plan
- Pas de synchronisation entre appareils (export/import JSON fourni)
- Supprimer les données de Safari efface aussi les données de Cap
- Le minuteur reste exact après suspension (timestamps), mais ne sonne pas app fermée
