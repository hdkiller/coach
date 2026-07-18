/**
 * Capture cropped product UI screenshots for public documentation.
 * Uses AUTH_BYPASS_USER session via the running Nuxt server.
 *
 * Usage: node scripts/capture-doc-screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const BASE = process.env.DOCS_SHOT_BASE || 'http://localhost:3099'
const OUT_DIR = join(process.cwd(), 'public/media/docs')
const TMP_DIR = join(process.cwd(), '.tmp/doc-screenshots')
const VIEW_W = 1440
const VIEW_H = 900

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(TMP_DIR, { recursive: true })

/** Nuxt UI maps <UDashboardPanel id="x"> → #dashboard-panel-x */
function panelSelector(panelId) {
  return `#dashboard-panel-${panelId}`
}

const SHOTS = [
  { name: 'athlete-dashboard-overview', path: '/dashboard', panelId: 'dashboard' },
  { name: 'settings-billing', path: '/settings/billing', panelId: 'settings' },
  { name: 'library-exercises', path: '/library/exercises', panelId: 'exercise-library' },
  { name: 'library-workouts', path: '/library/workouts', panelId: 'workout-library' },
  { name: 'activities-calendar', path: '/activities', panelId: 'activities' },
  { name: 'performance-load-chart', path: '/performance', panelId: 'performance' },
  { name: 'library-plans', path: '/library/plans', panelId: 'plan-library' },
  { name: 'coaching-overview', path: '/coaching', panelId: 'coaching-dashboard' },
  { name: 'coaching-calendar', path: '/coaching/calendar', panelId: 'coaching-calendar' },
  { name: 'coaching-athletes', path: '/coaching/athletes', panelId: 'coaching-athletes' }
]

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const close = page
      .locator('[role="dialog"] button')
      .filter({ hasText: /close|dismiss|got it|continue|not now|maybe later|ok/i })
      .first()
    if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
      await close.click().catch(() => {})
      await page.waitForTimeout(400)
      continue
    }
    // Escape closes many dialogs
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(300)
    const dialog = page.locator('[role="dialog"]')
    if (
      (await dialog.count()) === 0 ||
      !(await dialog
        .first()
        .isVisible()
        .catch(() => false))
    )
      break
  }
}

function toWebp(pngPath, webpPath) {
  execFileSync('cwebp', ['-q', '84', pngPath, '-o', webpPath], { stdio: 'pipe' })
}

async function shotPanel(page, panelId, pngPath) {
  const panel = page.locator(panelSelector(panelId)).first()
  await panel.waitFor({ state: 'visible', timeout: 15000 })
  const box = await panel.boundingBox()
  if (!box) throw new Error(`no bbox for ${panelId}`)

  // Visible viewport crop of the panel (exclude app sidebar by panel x)
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.min(VIEW_W - Math.round(box.x), Math.round(box.width)),
    height: Math.min(VIEW_H - Math.round(box.y), Math.round(box.height), 820)
  }
  if (clip.width < 600) {
    // Fallback: everything right of typical sidebar
    clip.x = 240
    clip.y = 0
    clip.width = VIEW_W - 240
    clip.height = VIEW_H
  }
  await page.screenshot({ path: pngPath, clip })
  return clip
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: VIEW_W, height: VIEW_H },
    colorScheme: 'dark',
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1500)
  await dismissOverlays(page)

  const results = []

  for (const shot of SHOTS) {
    const pngPath = join(TMP_DIR, `${shot.name}.png`)
    const webpPath = join(OUT_DIR, `${shot.name}.webp`)
    process.stdout.write(`\n→ ${shot.name}\n`)
    try {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(2000)
      await dismissOverlays(page)
      await page.waitForTimeout(500)
      const clip = await shotPanel(page, shot.panelId, pngPath)
      toWebp(pngPath, webpPath)
      console.log(`  crop ${clip.width}x${clip.height} @ (${clip.x},${clip.y}) → ${shot.name}.webp`)
      results.push({ name: shot.name, ok: true })
    } catch (err) {
      console.error(`  FAILED: ${err.message}`)
      results.push({ name: shot.name, ok: false, error: err.message })
    }
  }

  // Strength / gym template — resolve WeightTraining id from library API when possible
  try {
    process.stdout.write('\n→ library-gym-workout\n')
    const templates = await page.evaluate(async () => {
      const res = await fetch('/api/library/workouts?limit=50')
      if (!res.ok) return []
      return res.json()
    })
    const gym =
      (Array.isArray(templates) ? templates : []).find((t) => t.type === 'WeightTraining') ||
      (Array.isArray(templates) ? templates : [])[0]
    if (gym?.id) {
      await page.goto(`${BASE}/library/workouts/${gym.id}`, {
        waitUntil: 'networkidle',
        timeout: 60000
      })
      await page.waitForTimeout(2000)
      await dismissOverlays(page)
      const pngPath = join(TMP_DIR, 'library-gym-workout.png')
      const webpPath = join(OUT_DIR, 'library-gym-workout.webp')
      const clip = await shotPanel(page, 'workout-template-details', pngPath)
      toWebp(pngPath, webpPath)
      console.log(`  crop ${clip.width}x${clip.height} → library-gym-workout.webp`)
      results.push({ name: 'library-gym-workout', ok: true })
    } else {
      console.log('  skipped — no workout templates')
      results.push({ name: 'library-gym-workout', ok: false, error: 'no templates' })
    }
  } catch (err) {
    console.error(`  FAILED: ${err.message}`)
    results.push({ name: 'library-gym-workout', ok: false, error: err.message })
  }

  // Planned workout download modal
  try {
    process.stdout.write('\n→ planned-workout-export\n')
    await page.goto(`${BASE}/workouts`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(1500)
    await dismissOverlays(page)
    let planned = page.locator('a[href*="/workouts/planned/"]').first()
    if ((await planned.count()) === 0) {
      await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(2000)
      await dismissOverlays(page)
      planned = page.locator('a[href*="/workouts/planned/"]').first()
    }
    if ((await planned.count()) > 0) {
      await planned.click()
      await page.waitForTimeout(2500)
      await dismissOverlays(page)
      const downloadBtn = page.getByRole('button', { name: /download/i }).first()
      if ((await downloadBtn.count()) > 0) {
        await downloadBtn.click()
        await page.waitForTimeout(700)
        const dialog = page.locator('[role="dialog"]').first()
        const pngPath = join(TMP_DIR, 'planned-workout-export.png')
        const webpPath = join(OUT_DIR, 'planned-workout-export.webp')
        if (await dialog.isVisible().catch(() => false)) {
          await dialog.screenshot({ path: pngPath })
        } else {
          await shotPanel(page, 'planned-workout-details', pngPath)
        }
        toWebp(pngPath, webpPath)
        console.log('  saved planned-workout-export.webp')
        results.push({ name: 'planned-workout-export', ok: true })
      } else {
        // Still capture planned details as structured workout visual
        const pngPath = join(TMP_DIR, 'planned-workout-export.png')
        const webpPath = join(OUT_DIR, 'planned-workout-export.webp')
        await shotPanel(page, 'planned-workout-details', pngPath)
        toWebp(pngPath, webpPath)
        console.log('  saved planned details (no download modal)')
        results.push({ name: 'planned-workout-export', ok: true })
      }
    } else {
      console.log('  skipped — no planned workouts')
      results.push({ name: 'planned-workout-export', ok: false, error: 'no planned workouts' })
    }
  } catch (err) {
    console.error(`  FAILED: ${err.message}`)
    results.push({ name: 'planned-workout-export', ok: false, error: err.message })
  }

  await browser.close()

  const ok = results.filter((r) => r.ok).length
  console.log(`\nDone: ${ok}/${results.length}`)
  for (const r of results)
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.error ? ` (${r.error})` : ''}`)
  if (ok < 8) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
