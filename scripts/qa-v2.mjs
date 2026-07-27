// Vérification v2 : habitudes (création, coche, graphiques) + thème verre clair.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const preview = spawn('npx', ['vite', 'preview', '--port', '4176'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await (await browser.newContext({
  viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris'
})).newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto('http://localhost:4176/CAP-Gabriel-/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: "C'est parti" }).click()
await page.waitForTimeout(400)

// Habitudes : créer, cocher, détail
await page.getByLabel('Navigation principale').getByRole('button', { name: 'Plan' }).click()
await page.getByRole('button', { name: /Habitudes/ }).click()
await page.getByRole('button', { name: 'Créer une habitude' }).click()
await page.getByLabel('Nom', { exact: true }).fill("20 min d'Anki")
await page.getByRole('button', { name: 'Enregistrer' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Cocher « 20 min d'Anki »/ }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/v2-habits.png' })
await page.getByRole('button', { name: /20 min d'Anki/ }).last().click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/v2-habit-detail.png' })
await page.getByRole('button', { name: 'Fermer' }).click()
console.log('habitudes OK')

// Note
await page.getByRole('button', { name: 'Retour' }).click()
await page.getByRole('button', { name: /^Notes/ }).click()
await page.getByRole('button', { name: 'Nouvelle', exact: true }).click()
await page.getByLabel('Titre').fill('Fiche test')
await page.getByLabel('Contenu').fill('Contenu de la fiche')
await page.getByRole('button', { name: 'Enregistrer' }).click()
await page.waitForTimeout(300)
console.log('notes OK')

// Thème clair
await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
await page.getByRole('button', { name: /^Réglages/ }).click()
await page.getByRole('button', { name: 'Clair', exact: true }).click()
await page.waitForTimeout(300)
await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'qa-shots/v2-light.png' })
console.log('thème clair OK')

console.log(errors.length ? 'ERREURS: ' + errors.join('; ') : 'V2 OK')
await browser.close()
preview.kill()
process.exit(errors.length ? 1 : 0)
