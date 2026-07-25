// Vérification visuelle du thème Liquid Glass et du guide.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const preview = spawn('npx', ['vite', 'preview', '--port', '4175'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await (await browser.newContext({
  viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris'
})).newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
await page.goto('http://localhost:4175/CAP-Gabriel-/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: 'Continuer' }).click()
await page.getByRole('button', { name: "C'est parti" }).click()
await page.waitForTimeout(400)
// activer Liquid Glass
await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
await page.getByRole('button', { name: /Profil et réglages/ }).click()
await page.getByRole('button', { name: 'Liquid Glass' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/glass-settings.png' })
await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/glass-today.png' })
// guide
await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
await page.getByRole('button', { name: 'Retour' }).click()
await page.getByRole('button', { name: /Guide d'utilisation/ }).click()
await page.getByRole('button', { name: /Réviser efficacement/ }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/glass-guide.png' })
// mode clair
await page.getByRole('button', { name: 'Retour' }).click()
await page.getByRole('button', { name: /Profil et réglages/ }).click()
await page.getByRole('button', { name: 'Clair', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/light-settings.png' })
await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa-shots/light-today.png' })
console.log(errors.length ? 'ERREURS: ' + errors.join('; ') : 'GLASS+GUIDE OK')
await browser.close()
preview.kill()
process.exit(errors.length ? 1 : 0)
