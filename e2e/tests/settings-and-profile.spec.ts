import { test, expect } from '../fixtures/test-fixtures.ts'
import { SettingsPage } from '../pages/SettingsPage.ts'
import { ProfilePage } from '../pages/ProfilePage.ts'
import { GoalsPage } from '../pages/GoalsPage.ts'
import { BillingPage } from '../pages/BillingPage.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Settings & Profile Management Suite', () => {
  test.describe.configure({ mode: 'serial' })

  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']
  let athleteId: string

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool

    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete, `Test athlete ${E2E_ATHLETE_EMAIL} must exist in seed data`).toBeTruthy()
    athleteId = athlete!.id
  })

  test.afterAll(async () => {
    if (cleanupPool) {
      await cleanupPool.end()
    }
  })

  test('1. Renders user settings page and navigates sub-tabs', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage)
    await settings.goto('apps')

    await expect(authedPage).toHaveURL(/\/settings\/apps|\/settings/)
    await expect(authedPage).toHaveTitle(/Settings|Connected Apps/i)

    // Test navigation to AI Coach tab
    await settings.goto('ai')
    await expect(authedPage).toHaveURL(/\/settings\/ai/)

    // Test navigation to Developer tab
    await settings.goto('developer')
    await expect(authedPage).toHaveURL(/\/settings\/developer/)
  })

  test('2. Fetches user profile data from API endpoint', async ({ authedPage }) => {
    const res = await authedPage.request.get('/api/profile')
    expect(res.ok()).toBeTruthy()

    const profileData = await res.json()
    expect(profileData.profile.email).toBe(E2E_ATHLETE_EMAIL)
  })

  test('3. Updates athlete metrics (FTP, MaxHR, LTHR, weight, location) via PATCH API', async ({
    authedPage
  }) => {
    const updatePayload = {
      ftp: 310,
      maxHr: 192,
      lthr: 174,
      weight: 76,
      city: 'Innsbruck',
      country: 'Austria'
    }

    const patchRes = await authedPage.request.patch('/api/profile', {
      data: updatePayload
    })
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy()

    // Assert database record updated
    const updatedUser = await prisma.user.findUnique({ where: { id: athleteId } })
    expect(updatedUser?.ftp).toBe(310)
    expect(updatedUser?.maxHr).toBe(192)
    expect(updatedUser?.lthr).toBe(174)
    expect(updatedUser?.city).toBe('Innsbruck')
    expect(updatedUser?.country).toBe('Austria')
  })

  test('4. Renders billing and subscription management page', async ({ authedPage }) => {
    const billing = new BillingPage(authedPage)
    await billing.goto()

    await expect(authedPage).toHaveURL(/\/settings\/billing|\/pricing/)
  })

  test('5. Renders user profile page', async ({ authedPage }) => {
    const profile = new ProfilePage(authedPage)
    await profile.goto()

    await expect(authedPage).toHaveURL(/\/profile/)
  })

  test('6. Renders user goals page and opens goal wizard modal', async ({ authedPage }) => {
    const goals = new GoalsPage(authedPage)
    await goals.goto()

    await expect(authedPage).toHaveURL(/\/profile\/goals/)

    // Open Goal Wizard via query parameter or button
    await goals.gotoWizard()
    await expect(goals.wizardModal).toBeVisible({ timeout: 15000 })
  })
})
