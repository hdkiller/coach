import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5440/coach_e2e'

test.describe('Redis Task Driver & Flat-File LLM Mocking E2E', () => {
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

  async function waitForRun(authedPage: any, runId: string) {
    let lastRun: any = null
    await expect
      .poll(
        async () => {
          const response = await authedPage.request.get(`/api/runs/${encodeURIComponent(runId)}`)
          if (!response.ok()) return `HTTP_${response.status()}`
          lastRun = await response.json()
          return lastRun.status
        },
        { timeout: 60_000, intervals: [250, 500, 1000] }
      )
      .toBe('COMPLETED')
    return lastRun
  }

  test('Triggers workout analysis via Redis dispatcher and receives deterministic mock response', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // 1. Seed a test workout
    const workout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `redis-mock-analysis-${Date.now()}`,
        source: 'e2e',
        date: new Date(),
        title: 'Redis E2E Endurance Ride',
        type: 'Ride',
        durationSec: 3600,
        distanceMeters: 30000,
        tss: 60,
        aiAnalysisStatus: 'NOT_STARTED',
        aiAnalysis: null
      }
    })

    // 2. Trigger workout analysis endpoint
    const res = await authedPage.request.post(`/api/workouts/${workout.id}/analyze`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(json.status)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.output?.success).toBe(true)

    // 3. Verify workout status updated from NOT_STARTED
    const updated = await prisma.workout.findUnique({ where: { id: workout.id } })
    expect(updated).toBeTruthy()
    expect(updated?.aiAnalysisStatus).toBe('COMPLETED')
    expect(updated?.aiAnalysis).toBeTruthy()
  })

  test('Triggers daily activity recommendation via API with Redis task queue', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Trigger recommendation endpoint
    const res = await authedPage.request.post('/api/recommendations/today')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)

    await waitForRun(authedPage, json.jobId)
    const recommendation = await prisma.activityRecommendation.findUnique({
      where: { id: json.recommendationId }
    })
    expect(recommendation?.status).toBe('COMPLETED')
  })

  test('Triggers weekly training plan generation via API with Redis task queue', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // Trigger plan generation endpoint
    const res = await authedPage.request.post('/api/plans/generate', {
      data: {
        startDate: new Date().toISOString().split('T')[0],
        daysToPlan: 7,
        userInstructions: 'Focus on Zone 2 endurance'
      }
    })

    expect([200, 202]).toContain(res.status())
    const json = await res.json()
    expect(json.jobId).toMatch(/^redis:/)
    const run = await waitForRun(authedPage, json.jobId)
    expect(run.output?.success).toBe(true)
  })
})
