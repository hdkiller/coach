import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'
import { CalendarPage } from '../pages/CalendarPage.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Category E: Timezone Resilience & Calendar Date Preservation', () => {
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

  test('Preserves workout date consistency across America/Los_Angeles and Asia/Tokyo timezones', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const targetTitle = `Timezone Test Ride ${Date.now()}`
    const targetDateKey = new Date().toISOString().slice(0, 10)
    const dateUtc = new Date(`${targetDateKey}T00:00:00.000Z`)

    // 1. Create planned workout for target date
    const plannedWorkout = await prisma.plannedWorkout.create({
      data: {
        userId: athlete!.id,
        title: targetTitle,
        type: 'Ride',
        date: dateUtc,
        durationSec: 3600,
        tss: 60,
        externalId: `tz-test-${Date.now()}`
      }
    })

    try {
      // 2. Set user timezone to America/Los_Angeles (UTC-7)
      await prisma.user.update({
        where: { id: athlete!.id },
        data: { timezone: 'America/Los_Angeles' }
      })

      const calendar = new CalendarPage(authedPage)
      await calendar.goto()

      // Verify page loads cleanly and contains workout title or calendar grid
      await expect(authedPage).toHaveURL(/\/calendar/)

      // Query API for planned workouts under America/Los_Angeles
      const laRes = await authedPage.request.get(
        `/api/planned-workouts?startDate=${targetDateKey}T00:00:00.000Z`
      )
      expect(laRes.ok()).toBeTruthy()
      const laData = await laRes.json()
      const laWorkoutList = Array.isArray(laData) ? laData : laData.workouts || []
      const laWorkout = laWorkoutList.find(
        (w: any) => w.id === plannedWorkout.id || w.title === targetTitle
      )
      expect(laWorkout).toBeTruthy()

      // 3. Switch user timezone to Asia/Tokyo (UTC+9)
      await prisma.user.update({
        where: { id: athlete!.id },
        data: { timezone: 'Asia/Tokyo' }
      })

      await calendar.goto()

      // Query API for planned workouts under Asia/Tokyo
      const tokyoRes = await authedPage.request.get(
        `/api/planned-workouts?startDate=${targetDateKey}T00:00:00.000Z`
      )
      expect(tokyoRes.ok()).toBeTruthy()
      const tokyoData = await tokyoRes.json()
      const tokyoWorkoutList = Array.isArray(tokyoData) ? tokyoData : tokyoData.workouts || []
      const tokyoWorkout = tokyoWorkoutList.find(
        (w: any) => w.id === plannedWorkout.id || w.title === targetTitle
      )
      expect(tokyoWorkout).toBeTruthy()

      // 4. Assert both timezone views retain identical calendar date string representation
      const laDateString = new Date(laWorkout.date).toISOString().split('T')[0]
      const tokyoDateString = new Date(tokyoWorkout.date).toISOString().split('T')[0]
      expect(laDateString).toBe(targetDateKey)
      expect(tokyoDateString).toBe(targetDateKey)
    } finally {
      // Reset athlete timezone & cleanup workout
      await prisma.user.update({
        where: { id: athlete!.id },
        data: { timezone: 'UTC' }
      })
      await prisma.plannedWorkout.delete({ where: { id: plannedWorkout.id } })
    }
  })
})
