import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL, E2E_ADMIN_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'
import { generateSampleFitBuffer } from '../helpers/fit-fixture.ts'

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

  async function waitForRun(page: any, runId: string) {
    let lastRun: any = null
    await expect
      .poll(
        async () => {
          const response = await page.request.get(`/api/runs/${encodeURIComponent(runId)}`)
          if (!response.ok()) return `HTTP_${response.status()}`
          lastRun = await response.json()
          return lastRun.status
        },
        { timeout: 60_000, intervals: [250, 500, 1000] }
      )
      .toBe('COMPLETED')
    return lastRun
  }

  // --- Phase 0 (Baseline) ---

  test('Triggers workout analysis via Redis dispatcher and receives deterministic mock response', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

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

    const res = await authedPage.request.post(`/api/workouts/${workout.id}/analyze`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(json.status)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.output?.success).toBe(true)

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

  // --- Phase 1 Priority Tasks ---

  test('Triggers generate-structured-workout via API and asserts structure saved', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const plannedWorkout = await prisma.plannedWorkout.create({
      data: {
        userId: athlete!.id,
        externalId: `redis-mock-structure-${Date.now()}`,
        date: new Date(),
        title: 'Redis E2E Structured Ride',
        type: 'Ride',
        durationSec: 3600,
        tss: 60,
        structuredWorkout: null
      }
    })

    const res = await authedPage.request.post(
      `/api/workouts/planned/${plannedWorkout.id}/generate-structure`
    )
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.taskId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.taskId)
    expect(run.status).toBe('COMPLETED')

    const updated = await prisma.plannedWorkout.findUnique({ where: { id: plannedWorkout.id } })
    expect(updated).toBeTruthy()
    expect(updated?.structuredWorkout).toBeTruthy()
    const steps = (updated?.structuredWorkout as any)?.steps
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThan(0)
  })

  test('Triggers generate-daily-checkin via API and asserts check-in persisted', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const res = await authedPage.request.post('/api/checkin/generate', {
      data: { force: true }
    })
    expect(res.ok()).toBeTruthy()

    const activeRes = await authedPage.request.get('/api/runs/active')
    expect(activeRes.ok()).toBeTruthy()
    const activeRuns = await activeRes.json()
    const checkinRun = activeRuns.find((r: any) => r.id.startsWith('redis:')) ?? activeRuns[0]
    expect(checkinRun).toBeTruthy()

    const run = await waitForRun(authedPage, checkinRun.id)
    expect(run.status).toBe('COMPLETED')

    const checkin = await prisma.dailyCheckin.findFirst({
      where: { userId: athlete!.id },
      orderBy: { createdAt: 'desc' }
    })
    expect(checkin).toBeTruthy()
    expect(['COMPLETED', 'PENDING']).toContain(checkin?.status)
  })

  test('Triggers generate-ad-hoc-workout via API and asserts PlannedWorkout created', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const noteTag = `e2e-adhoc-${Date.now()}`
    const res = await authedPage.request.post('/api/workouts/generate', {
      data: {
        type: 'Ride',
        durationMinutes: 60,
        intensity: 'Endurance',
        notes: noteTag
      }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.status).toBe('COMPLETED')

    const latestPlanned = await prisma.plannedWorkout.findFirst({
      where: { userId: athlete!.id },
      orderBy: { createdAt: 'desc' }
    })
    expect(latestPlanned).toBeTruthy()
    expect(latestPlanned?.title).toBeTruthy()
  })

  test('Triggers analyze-nutrition via API and asserts AI analysis updated', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const todayDate = new Date()
    todayDate.setUTCHours(0, 0, 0, 0)

    const nutrition = await prisma.nutrition.upsert({
      where: { userId_date: { userId: athlete!.id, date: todayDate } },
      update: {
        calories: 2200,
        protein: 150,
        carbs: 250,
        fat: 60,
        aiAnalysisStatus: 'NOT_STARTED'
      },
      create: {
        userId: athlete!.id,
        date: todayDate,
        calories: 2200,
        protein: 150,
        carbs: 250,
        fat: 60,
        aiAnalysisStatus: 'NOT_STARTED'
      }
    })

    const res = await authedPage.request.post(`/api/nutrition/${nutrition.id}/analyze`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.status).toBe('COMPLETED')

    const updated = await prisma.nutrition.findUnique({ where: { id: nutrition.id } })
    expect(updated?.aiAnalysisStatus).toBe('COMPLETED')
    expect(updated?.aiAnalysisJson).toBeTruthy()
  })

  test('Triggers daily-coach via admin debug API and asserts DAILY_SUGGESTION report created', async ({
    adminPage
  }) => {
    const adminUser = await prisma.user.findUnique({ where: { email: E2E_ADMIN_EMAIL } })
    expect(adminUser).toBeTruthy()

    const res = await adminPage.request.post('/api/admin/debug/trigger-test', {
      data: { taskName: 'daily-coach' }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.runId).toMatch(/^redis:/)

    const run = await waitForRun(adminPage, json.runId)
    expect(run.status).toBe('COMPLETED')

    const report = await prisma.report.findFirst({
      where: { userId: adminUser!.id, type: 'DAILY_SUGGESTION' },
      orderBy: { createdAt: 'desc' }
    })
    expect(report).toBeTruthy()
    expect(report?.status).toBe('COMPLETED')
  })

  test('Triggers generate-athlete-profile via API and asserts profile report completed', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const res = await authedPage.request.post('/api/profile/generate')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.status).toBe('COMPLETED')

    const report = await prisma.report.findUnique({ where: { id: json.reportId } })
    expect(report).toBeTruthy()
    expect(report?.status).toBe('COMPLETED')
  })

  // --- Phase 2 High Value Tasks ---

  test('Triggers adjust-structured-workout via API and asserts structure updated', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const plannedWorkout = await prisma.plannedWorkout.create({
      data: {
        userId: athlete!.id,
        externalId: `redis-mock-adjust-${Date.now()}`,
        date: new Date(),
        title: 'Redis E2E Adjust Ride',
        type: 'Ride',
        durationSec: 2700,
        tss: 60,
        structuredWorkout: {
          steps: [{ type: 'Warmup', durationSeconds: 300 }]
        }
      }
    })

    const res = await authedPage.request.post(`/api/workouts/planned/${plannedWorkout.id}/adjust`, {
      data: {
        durationMinutes: 45,
        intensity: 'Tempo',
        feedback: 'Shorter and harder'
      }
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.jobId)
    expect(run.status).toBe('COMPLETED')

    const updated = await prisma.plannedWorkout.findUnique({ where: { id: plannedWorkout.id } })
    expect(updated).toBeTruthy()
    expect(updated?.structuredWorkout).toBeTruthy()
  })

  test('Triggers analyze-plan-adherence via API and asserts adherence calculated', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const plannedWorkout = await prisma.plannedWorkout.create({
      data: {
        userId: athlete!.id,
        externalId: `redis-planned-adherence-${Date.now()}`,
        date: new Date(),
        title: 'Planned Adherence Ride',
        type: 'Ride',
        durationSec: 3600,
        tss: 60
      }
    })

    const workout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `redis-workout-adherence-${Date.now()}`,
        plannedWorkoutId: plannedWorkout.id,
        source: 'e2e',
        date: new Date(),
        title: 'Completed Adherence Ride',
        type: 'Ride',
        durationSec: 3600,
        distanceMeters: 30000,
        tss: 58
      }
    })

    const res = await authedPage.request.post(`/api/workouts/${workout.id}/analyze-adherence`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.taskId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, json.taskId)
    expect(run.status).toBe('COMPLETED')
  })

  test('Triggers ingest-fit-file via upload API and asserts FitFile queued/processed', async ({
    authedPage
  }) => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const sampleFitBuffer = generateSampleFitBuffer('E2E Ingest FIT Ride')

    const res = await authedPage.request.post('/api/workouts/upload-fit', {
      multipart: {
        file: {
          name: `e2e_sample_${Date.now()}.fit`,
          mimeType: 'application/octet-stream',
          buffer: sampleFitBuffer
        },
        name: 'E2E Synthetic FIT Ingest'
      }
    })

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBe(true)
    const item = json.results.items[0]
    expect(item.fitFileId).toBeTruthy()
    let jobId = item.jobId
    if (!jobId) {
      const activeRes = await authedPage.request.get('/api/runs/active')
      expect(activeRes.ok()).toBeTruthy()
      const activeRuns = await activeRes.json()
      const fitRun = activeRuns.find((r: any) => r.id.startsWith('redis:')) ?? activeRuns[0]
      expect(fitRun).toBeTruthy()
      jobId = fitRun.id
    }
    expect(jobId).toMatch(/^redis:/)

    const run = await waitForRun(authedPage, jobId)
    expect(run.status).toBe('COMPLETED')
  })
})
