// QA thèmes : bascule Sombre → Clair → Sombre, vérifie le fond et zéro erreur JS.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const preview = spawn('npx', ['vite', 'preview', '--port', '4177'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await (await browser.newContext({
  viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris'
})).newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
await page.goto('http://localhost:4177/CAP-Gabriel-/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: "C'est parti" }).click()
await page.waitForTimeout(400)

await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
await page.getByRole('button', { name: /^Réglages/ }).click()
await page.getByRole('button', { name: 'Clair', exact: true }).click()
await page.waitForTimeout(400)
const lightBg = await page.evaluate(() => getComputedStyle(document.querySelector('.app-shell')).backgroundColor)
await page.screenshot({ path: 'qa-shots/theme-light.png' })
await page.getByRole('button', { name: 'Sombre', exact: true }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'qa-shots/theme-dark.png' })
const hasLight = await page.evaluate(() => document.querySelector('.app-shell').classList.contains('theme-light'))

if (hasLight) errors.push('theme-light toujours actif après retour au sombre')
console.log('fond clair =', lightBg)
console.log(errors.length ? 'ERREURS: ' + errors.join('; ') : 'THEMES OK')
await browser.close()
preview.kill()
process.exit(errors.length ? 1 : 0)
