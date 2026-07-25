// Smoke test sur le site publié : chargement, onboarding, check-in,
// service worker, erreurs console.
import { chromium } from 'playwright-core'

const BASE = 'https://stoesselgabriel2008-lab.github.io/CAP-Gabriel-/'
const errors = []
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined
})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: 'dark', locale: 'fr-FR', timezoneId: 'Europe/Paris'
})
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`) })

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'qa-shots/live-01.png' })
  await page.getByRole('button', { name: 'Commencer' }).click({ timeout: 15000 })
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: "C'est parti" }).click()
  await page.waitForTimeout(500)
  console.log('LIVE: onboarding OK')
  await page.getByRole('button', { name: 'Faire le check-in' }).click()
  await page.getByRole('button', { name: 'Haute' }).click()
  await page.getByRole('button', { name: 'Bas', exact: true }).click()
  await page.getByRole('button', { name: 'Bon', exact: true }).click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.waitForTimeout(400)
  console.log('LIVE: check-in OK')
  const sw = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.()
    return regs?.length ?? 0
  })
  console.log('LIVE: service workers enregistrés =', sw)
  if (sw === 0) errors.push('service worker non enregistré')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const persisted = await page.getByText('Check-in :').count()
  console.log('LIVE: persistance après rechargement =', persisted > 0 ? 'OK' : 'ÉCHEC')
  if (persisted === 0) errors.push('persistance live échouée')
  await page.screenshot({ path: 'qa-shots/live-02.png' })
} catch (e) {
  errors.push('script: ' + e.message)
  await page.screenshot({ path: 'qa-shots/live-99.png' }).catch(() => {})
}
await browser.close()
if (errors.length) {
  console.log('=== ERREURS LIVE ===')
  for (const e of errors) console.log(' -', e)
  process.exit(1)
}
console.log('=== LIVE PASS ===')
process.exit(0)
