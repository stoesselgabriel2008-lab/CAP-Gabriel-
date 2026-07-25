// QA automatisée : charge l'app en viewport iPhone, vérifie la console,
// déroule l'onboarding et les parcours principaux, prend des captures.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173/cap-gabriel-/'
const SHOTS = 'qa-shots'
mkdirSync(SHOTS, { recursive: true })

const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))

const errors = []
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
  colorScheme: 'dark',
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris'
})
const page = await ctx.newPage()
page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()) })
page.on('pageerror', err => errors.push('pageerror: ' + err.message))
page.on('response', res => { if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`) })

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const log = (m) => console.log('QA:', m)

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await shot('01-onboarding')

  // Onboarding complet
  await page.getByRole('button', { name: 'Commencer' }).click()
  await shot('02-onboarding-profil')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: "C'est parti" }).click()
  await page.waitForTimeout(400)
  await shot('03-today-empty')
  log('onboarding OK')

  // Check-in
  await page.getByRole('button', { name: 'Faire le check-in' }).click()
  await page.getByRole('button', { name: 'Moyenne' }).click()
  await page.getByRole('button', { name: 'Bas', exact: true }).click()
  await page.getByRole('button', { name: 'Bon', exact: true }).click()
  await shot('04-checkin')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(300)
  log('check-in OK')

  // Capture d'une tâche
  await page.getByRole('button', { name: 'Ajouter' }).click()
  await page.getByLabel("Qu'as-tu en tête ?").fill('Réviser anatomie membre supérieur')
  await page.getByRole('button', { name: 'Tâche' }).click()
  await page.getByLabel('Quand').getByRole('button', { name: "Aujourd'hui" }).click()
  await shot('05-capture')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(300)
  log('capture OK')

  // Top 3
  await page.getByRole('button', { name: 'Choisir', exact: true }).click()
  await page.getByRole('button', { name: /Réviser anatomie/ }).click()
  await page.getByRole('button', { name: 'OK' }).click()
  await page.waitForTimeout(300)
  await shot('06-today-top3')
  log('top3 OK')

  // Réviser : créer matière + chapitre + plan J
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Réviser' }).click()
  await page.getByRole('button', { name: 'Créer une matière' }).click()
  await page.getByLabel('Nom', { exact: true }).fill('Anatomie')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.getByRole('button', { name: /Anatomie/ }).click()
  await page.getByRole('button', { name: 'Nouveau chapitre' }).click()
  await page.getByLabel('Nom du chapitre').fill('Membre supérieur — ostéologie')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(300)
  await shot('07-review-subject')
  await page.getByRole('button', { name: 'Retour' }).click()
  await shot('08-review-home')
  log('review OK')

  // Minuteur : lancer et vérifier
  await page.getByRole('button', { name: /Membre supérieur/ }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Commencer 25 min$/ }).click()
  await page.waitForTimeout(600)
  await shot('09-timer')
  await page.getByRole('button', { name: 'Réduire' }).click()
  await page.waitForTimeout(300)
  await shot('10-today-with-timer')
  // terminer
  await page.getByRole('button', { name: /Session en cours/ }).click()
  await page.getByRole('button', { name: 'Terminer', exact: true }).click()
  await page.waitForTimeout(300)
  await shot('11-end-session')
  await page.getByRole('button', { name: 'Moyen', exact: true }).click()
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).first().click()
  await page.waitForTimeout(300)
  log('timer OK')

  // SOS complet (depuis l'accueil)
  await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'SOS' }).first().click()
  await shot('12-sos-intro')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await shot('13-sos-cut')
  await page.getByRole('button', { name: "C'est fait" }).click()
  await shot('14-sos-breathe')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Stress', exact: true }).first().click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await shot('15-sos-wave')
  await page.getByRole('button', { name: 'La vague redescend' }).click()
  await page.getByRole('button', { name: /Marcher cinq minutes/ }).click()
  await page.getByRole('button', { name: "C'est fait" }).click()
  await shot('16-sos-done')
  await page.getByRole('button', { name: 'Terminer', exact: true }).click()
  log('SOS OK')

  // Coach → Contrôle
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Coach' }).click()
  await shot('17-coach')
  await page.getByRole('button', { name: 'Ouvrir', exact: true }).click()
  await shot('18-control')
  await page.getByRole('button', { name: 'Retour' }).click()
  log('coach OK')

  // Centre de commande
  await page.getByRole('button', { name: 'Rechercher ou agir' }).click()
  await page.getByRole('searchbox', { name: 'Recherche' }).fill('erreur')
  await page.waitForTimeout(300)
  await shot('19-command')
  await page.getByRole('button', { name: 'Fermer' }).click()
  log('command OK')

  // Moi + données
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
  await shot('20-me')
  await page.getByRole('button', { name: /Science et mythes/ }).click()
  await shot('21-science')
  await page.getByRole('button', { name: 'Retour' }).click()
  await page.getByRole('button', { name: /^Données/ }).click()
  await shot('22-data')
  log('me OK')

  // Persistance : recharger et vérifier que les données restent
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
  const hasTask = await page.getByText('Réviser anatomie membre supérieur').count()
  if (hasTask === 0) errors.push('PERSISTANCE: la tâche a disparu après rechargement')
  await shot('23-after-reload')
  log('persistance ' + (hasTask > 0 ? 'OK' : 'ÉCHEC'))

  // Overflow horizontal ?
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 1) errors.push(`OVERFLOW horizontal: ${overflow}px`)
} catch (e) {
  errors.push('script: ' + e.message)
  await shot('99-failure')
}

await browser.close()
preview.kill()

if (errors.length) {
  console.log('\n=== ERREURS ===')
  for (const e of errors) console.log(' -', e)
  process.exit(1)
} else {
  console.log('\n=== QA PASS : aucune erreur console, parcours complets OK ===')
  process.exit(0)
}
