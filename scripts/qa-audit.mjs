// Audit visuel : tous les écrans, 2 tailles d'iPhone, overflow check partout.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
const preview = spawn('npx', ['vite', 'preview', '--port', '4180'], { stdio: 'pipe' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const errors = []

async function sweep(width, height, tag) {
  const page = await (await browser.newContext({
    viewport: { width, height }, colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris'
  })).newPage()
  page.on('pageerror', e => errors.push(`${tag} pageerror: ` + e.message))
  const shot = async (name) => {
    await page.waitForTimeout(250)
    await page.screenshot({ path: `qa-shots/audit-${tag}-${name}.png` })
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (ov > 1) errors.push(`${tag} OVERFLOW ${ov}px sur ${name}`)
  }
  await page.goto('http://localhost:4180/CAP-Gabriel-/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: "C'est parti" }).click()
  await page.waitForTimeout(300)
  // données de base
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Plan' }).click()
  await page.getByRole('button', { name: /Habitudes/ }).first().click()
  await page.getByRole('button', { name: 'Créer une habitude' }).click()
  await page.getByLabel('Nom', { exact: true }).fill('Anki quotidien')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(200)
  await shot('habits')
  await page.getByRole('button', { name: 'Retour' }).click()
  await shot('plan')
  await page.getByRole('button', { name: 'Nouvelle tâche', exact: true }).first().click()
  await shot('task-editor')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await page.getByLabel('Navigation principale').getByRole('button', { name: "Aujourd'hui" }).click()
  await shot('today')
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Réviser' }).click()
  await shot('review')
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Coach' }).click()
  await shot('coach')
  await page.getByRole('button', { name: /^Ouvrir / }).click()
  await shot('control')
  await page.getByRole('button', { name: 'Retour' }).click()
  await page.getByRole('button', { name: /Sommeil/ }).first().click()
  await shot('sleep')
  await page.getByRole('button', { name: 'Retour' }).click()
  await page.getByLabel('Navigation principale').getByRole('button', { name: 'Moi' }).click()
  await shot('me')
  await page.getByRole('button', { name: /^Réglages/ }).click()
  await shot('settings')
  await page.getByRole('button', { name: 'Retour' }).click()
  await page.getByRole('button', { name: /Statistiques/ }).click()
  await shot('stats')
  await page.close()
}

try {
  await sweep(390, 844, 'std')
  await sweep(375, 667, 'se')
} catch (e) { errors.push('script: ' + e.message) }
console.log(errors.length ? 'PROBLÈMES:\n - ' + errors.join('\n - ') : 'SWEEP OK (pas d\'overflow ni erreur JS)')
await browser.close(); preview.kill(); process.exit(0)
