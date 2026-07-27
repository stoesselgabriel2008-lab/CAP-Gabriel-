// Vérifie la recherche par synonymes : "dodo" doit trouver Sommeil.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
const preview = spawn('npx', ['vite', 'preview', '--port', '4178'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris' })).newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
await page.goto('http://localhost:4178/CAP-Gabriel-/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: "C'est parti" }).click()
await page.waitForTimeout(300)
const check = async (q, expected) => {
  await page.getByRole('button', { name: 'Rechercher ou agir' }).click()
  await page.getByRole('searchbox', { name: 'Recherche' }).fill(q)
  await page.waitForTimeout(200)
  const n = await page.getByRole('button', { name: new RegExp(expected) }).count()
  console.log(`"${q}" → ${expected} : ${n > 0 ? 'OK' : 'ÉCHEC'}`)
  if (n === 0) errors.push(`synonyme "${q}" ne trouve pas ${expected}`)
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
}
await check('dodo', 'Sommeil')
await check('dormir', 'Sommeil')
await check('nofap', 'Contrôle')
await check('pomodoro', 'minuteur')
await check('muscu', 'Corps')
await check('parametres', 'Réglages')
await check('backup', 'Export')
await page.screenshot({ path: 'qa-shots/v26-today.png' })
console.log(errors.length ? 'ERREURS: ' + errors.join('; ') : 'SYNONYMES OK')
await browser.close(); preview.kill(); process.exit(errors.length ? 1 : 0)
