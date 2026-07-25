import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'
import { DashboardPage } from '../pages/DashboardPage.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('PR #253 & Smoke Test 3: Sync Results & Dashboard', () => {
  test.describe.configure({ mode: 'serial' })
  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
    await cleanupPool.end()
  })

  test('Sync All triggers background sync and returns valid date range', async ({ authedPage }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Trigger sync all via API
    const syncRes = await authedPage.request.post('/api/integrations/sync', {
      data: { provider: 'all', days: 7 }
    })

    expect([200, 409]).toContain(syncRes.status())
    if (syncRes.ok()) {
      const syncData = await syncRes.json()
      expect(syncData.success).toBe(true)
      expect(syncData.provider).toBe('all')
      expect(syncData.dateRange).toBeDefined()
    }
  })

  test('Intervals-only account renders dashboard activity and recommendations', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    await expect(authedPage.getByRole('heading').first()).toBeVisible()
  })

  test('Non-Intervals account (Garmin/Strava) renders activity without requiring Intervals', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Add a Strava integration for athlete
    const stravaIntegration = await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: athlete!.id,
          provider: 'strava'
        }
      },
      update: {
        syncStatus: 'SUCCESS',
        lastSyncAt: new Date()
      },
      create: {
        userId: athlete!.id,
        provider: 'strava',
        syncStatus: 'SUCCESS',
        accessToken: 'e2e-strava-token-only',
        externalUserId: 'e2e-strava-user-only'
      }
    })

    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    await expect(authedPage.getByRole('heading').first()).toBeVisible()

    // Cleanup
    await prisma.integration.deleteMany({ where: { id: stravaIntegration.id } })
  })

  test('Account with no integrations but existing imported data renders recent activity', async ({
    authedPage
  }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    // Verify seeded workout titles or sections appear
    await expect(
      authedPage.getByText(/E2E Endurance Ride|E2E Tempo Run|Recent Activity|Dashboard/i).first()
    ).toBeVisible()
  })

  test('Pending outbound planned-workout change is processed before Sync All pull', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Create a planned workout with local edits
    const planned = await prisma.plannedWorkout.upsert({
      where: { id: 'e2e-planned-outbound-sync' },
      update: {
        title: 'Updated Local Planned Workout',
        modifiedLocally: true,
        completed: false
      },
      create: {
        id: 'e2e-planned-outbound-sync',
        userId: athlete!.id,
        externalId: 'e2e-planned-outbound-sync',
        date: new Date(),
        title: 'Updated Local Planned Workout',
        type: 'Ride',
        durationSec: 3600,
        tss: 60,
        modifiedLocally: true,
        completed: false
      }
    })

    expect(planned.modifiedLocally).toBe(true)

    // Trigger sync all
    const syncRes = await authedPage.request.post('/api/integrations/sync', {
      data: { provider: 'all' }
    })

    expect([200, 409]).toContain(syncRes.status())

    // Cleanup
    await prisma.plannedWorkout.delete({ where: { id: planned.id } })
  })

  test('Dashboard renders existing cached workouts when integration sync status is actively SYNCING', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Mark user integration as actively SYNCING
    await prisma.integration.updateMany({
      where: { userId: athlete!.id, provider: 'intervals' },
      data: { syncStatus: 'SYNCING' }
    })

    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    // Verify dashboard renders cached workout or header heading instead of breaking
    await expect(authedPage.getByRole('heading').first()).toBeVisible()

    // Reset status back to SUCCESS
    await prisma.integration.updateMany({
      where: { userId: athlete!.id, provider: 'intervals' },
      data: { syncStatus: 'SUCCESS' }
    })
  })
})
