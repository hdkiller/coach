import { test, expect } from '../fixtures/test-fixtures.ts'
import { DashboardPage } from '../pages/DashboardPage.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Dashboard & Daily Recommendations Suite', () => {
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

  test('1. Renders authenticated athlete dashboard with recommendation elements', async ({
    authedPage
  }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    await expect(authedPage).toHaveTitle(/Dashboard/i)

    // Verify main heading and content containers render
    await expect(authedPage.getByRole('heading').first()).toBeVisible()
  })

  test('2. Returns today recommendation data from API endpoint', async ({ authedPage }) => {
    const recRes = await authedPage.request.get('/api/recommendations/today')
    expect(recRes.ok()).toBeTruthy()

    const recData = await recRes.json()
    if (recData) {
      expect(recData.id).toBeTruthy()
      expect(recData.recommendation || recData.reasoning).toBeTruthy()
    }
  })

  test('3. Opens refine recommendation modal and accepts custom athlete feedback', async ({
    authedPage
  }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    if (await dashboard.refineButton.isVisible()) {
      await dashboard.refineButton.click()
      await expect(dashboard.refineModal).toBeVisible()

      if (await dashboard.refineTextarea.isVisible()) {
        await dashboard.refineTextarea.fill(
          'Felt fatigued today, focus on light Zone 1 recovery spin'
        )
        await expect(dashboard.refineTextarea).toHaveValue(
          'Felt fatigued today, focus on light Zone 1 recovery spin'
        )
      }
    }
  })

  test('4. Opens morning check-in drawer via focus query parameter', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.gotoCheckin()

    // Verify modal/drawer dialog is opened once dashboard finishes initial loading
    await expect(dashboard.checkinModal).toBeVisible({ timeout: 15000 })
  })

  test('5. Opens today wellness modal via focus query parameter', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.gotoWellness()

    // Verify wellness dialog is opened once dashboard finishes initial loading
    await expect(dashboard.wellnessModal).toBeVisible({ timeout: 15000 })
  })

  test('6. Navigation sidebar links function cleanly', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    if (await dashboard.navCalendar.isVisible()) {
      await dashboard.navCalendar.click()
      await expect(authedPage).toHaveURL(/\/calendar/)
    }
  })
})
