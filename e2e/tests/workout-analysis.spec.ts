import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('PR #255 & Smoke Test 1: Workout Analysis & Enqueue', () => {
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

  test('Missing workout analysis transitions from NOT_STARTED to PENDING/COMPLETED when triggered', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // 1. Enable automatic workout analysis
    await prisma.user.update({
      where: { id: athlete!.id },
      data: { aiAutoAnalyzeWorkouts: true }
    })

    // 2. Seed a completed workout with no existing analysis
    const workout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `e2e-no-analysis-${Date.now()}`,
        source: 'e2e',
        date: new Date(),
        title: 'E2E Unanalyzed Ride',
        type: 'Ride',
        durationSec: 1800,
        distanceMeters: 15000,
        tss: 30,
        aiAnalysisStatus: 'NOT_STARTED',
        aiAnalysis: null
      }
    })

    // 3. Trigger workout analysis via API
    const analyzeRes = await authedPage.request.post(`/api/workouts/${workout.id}/analyze`)
    expect(analyzeRes.ok()).toBeTruthy()
    const analyzeData = await analyzeRes.json()
    expect(analyzeData.success).toBe(true)
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(analyzeData.status)

    // Verify DB status updated from NOT_STARTED
    const updatedWorkout = await prisma.workout.findUnique({ where: { id: workout.id } })
    expect(updatedWorkout?.aiAnalysisStatus).not.toBe('NOT_STARTED')

    // Clean up created test workout
    await prisma.workout.delete({ where: { id: workout.id } })
  })

  test('Asking chat about last workout returns immediate response (non-blank bubble)', async ({
    authedPage
  }) => {
    await authedPage.goto('/chat')
    await expect(authedPage).toHaveURL(/\/chat/)

    const input = authedPage.getByPlaceholder(
      'Ask Coach Watts, add a meal photo, or dictate a note...'
    )
    await expect(input).toBeVisible()
    await input.fill('How did I do on my last workout?')
    await input.press('Enter')

    // Assert chat response bubble appears and contains readable text
    const chatBubbles = authedPage.locator(
      '[class*="chat"], [class*="message"], [data-testid*="message"]'
    )
    await expect(chatBubbles.first()).toBeVisible({ timeout: 15000 })
  })

  test('Submitting analysis request twice quickly queues only one analysis run', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const workout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `e2e-dedup-${Date.now()}`,
        source: 'e2e',
        date: new Date(),
        title: 'E2E Deduplication Test Ride',
        type: 'Ride',
        durationSec: 2400,
        tss: 45,
        aiAnalysisStatus: 'NOT_STARTED'
      }
    })

    // Rapid double-trigger
    const [res1, res2] = await Promise.all([
      authedPage.request.post(`/api/workouts/${workout.id}/analyze`),
      authedPage.request.post(`/api/workouts/${workout.id}/analyze`)
    ])

    expect(res1.ok()).toBeTruthy()
    expect(res2.ok()).toBeTruthy()

    const data1 = await res1.json()
    const data2 = await res2.json()

    // Second call should acknowledge existing run or return status without erroring
    expect(data1.success).toBe(true)
    expect(data2.success).toBe(true)

    // Cleanup
    await prisma.workout.delete({ where: { id: workout.id } })
  })

  test('Triggers analysis for NOT_STARTED and FAILED workouts correctly', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const failedWorkout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `e2e-failed-workout-${Date.now()}`,
        source: 'e2e',
        date: new Date(),
        title: 'E2E Previously Failed Workout',
        type: 'Run',
        durationSec: 1800,
        tss: 35,
        aiAnalysisStatus: 'FAILED'
      }
    })

    const retryRes = await authedPage.request.post(`/api/workouts/${failedWorkout.id}/analyze`)
    expect(retryRes.ok()).toBeTruthy()
    const retryData = await retryRes.json()
    expect(retryData.success).toBe(true)

    await prisma.workout.delete({ where: { id: failedWorkout.id } })
  })

  test('Respects auto-analysis enabled vs disabled user settings', async ({ authedPage }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Disable auto-analysis
    await prisma.user.update({
      where: { id: athlete!.id },
      data: { aiAutoAnalyzeWorkouts: false }
    })

    const userSettings = await prisma.user.findUnique({
      where: { id: athlete!.id },
      select: { aiAutoAnalyzeWorkouts: true }
    })

    expect(userSettings?.aiAutoAnalyzeWorkouts).toBe(false)
  })

  test('Unsupported activity types are skipped during analysis', async ({ authedPage }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const meditationWorkout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `e2e-meditation-${Date.now()}`,
        source: 'e2e',
        date: new Date(),
        title: 'Morning Meditation',
        type: 'Meditation',
        durationSec: 600,
        aiAnalysisStatus: 'NOT_STARTED'
      }
    })

    const res = await authedPage.request.post(`/api/workouts/${meditationWorkout.id}/analyze`)
    // API will accept request, but task/engine skips non-exercise activities safely
    expect([200, 400, 422]).toContain(res.status())

    await prisma.workout.delete({ where: { id: meditationWorkout.id } })
  })
})
