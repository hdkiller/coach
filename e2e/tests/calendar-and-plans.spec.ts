import { test, expect } from '../fixtures/test-fixtures.ts'
import { CalendarPage } from '../pages/CalendarPage.ts'
import { PlansPage } from '../pages/PlansPage.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Calendar & Training Plans Suite', () => {
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

  test('1. Renders calendar page and navigation tabs', async ({ authedPage }) => {
    const calendar = new CalendarPage(authedPage)
    await calendar.goto()

    await expect(authedPage).toHaveURL(/\/calendar/)
    await expect(authedPage).toHaveTitle(/Calendar/i)
  })

  test('2. Renders training plan overview page', async ({ authedPage }) => {
    const calendar = new CalendarPage(authedPage)
    await calendar.gotoPlan()

    await expect(authedPage).toHaveURL(/\/plan/)
  })

  test('3. Renders training plans library page', async ({ authedPage }) => {
    const plans = new PlansPage(authedPage)
    await plans.gotoLibrary()

    await expect(authedPage).toHaveURL(/\/training-plans|\/plans/)
  })

  test('4. Creates a planned workout via API and persists record in database', async ({
    authedPage
  }) => {
    const workoutPayload = {
      date: '2026-07-28T08:00:00.000Z',
      title: 'E2E Threshold Intervals 4x8m',
      type: 'Ride',
      durationSec: 5400,
      tss: 85,
      workIntensity: 0.88,
      description: '4x8min @ 105% FTP threshold intervals'
    }

    const res = await authedPage.request.post('/api/planned-workouts', {
      data: workoutPayload
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    const data = await res.json()
    const createdWorkout = data.workout || data
    expect(createdWorkout.id).toBeTruthy()

    // Assert database record in PlannedWorkout table
    const plannedRecord = await prisma.plannedWorkout.findUnique({
      where: { id: createdWorkout.id }
    })
    expect(plannedRecord).toBeTruthy()
    expect(plannedRecord?.title).toBe('E2E Threshold Intervals 4x8m')
    expect(plannedRecord?.tss).toBe(85)
  })

  test('5. Reschedules a planned workout to a new date via PATCH API', async ({ authedPage }) => {
    // Create initial workout
    const createRes = await authedPage.request.post('/api/planned-workouts', {
      data: {
        date: '2026-07-29T08:00:00.000Z',
        title: 'E2E Reschedule Target Workout',
        type: 'Ride',
        durationSec: 3600
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const created = await createRes.json()
    const workoutId = (created.workout || created).id

    // Update date via PATCH
    const patchRes = await authedPage.request.patch(`/api/planned-workouts/${workoutId}`, {
      data: {
        date: '2026-07-30T08:00:00.000Z',
        description: 'Rescheduled to Thursday'
      }
    })
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy()

    // Assert database record updated
    const updatedRecord = await prisma.plannedWorkout.findUnique({
      where: { id: workoutId }
    })
    expect(updatedRecord).toBeTruthy()
    expect(updatedRecord?.description).toBe('Rescheduled to Thursday')
  })

  test('6. Deletes a planned workout via DELETE API', async ({ authedPage }) => {
    // Create temporary workout to delete
    const createRes = await authedPage.request.post('/api/planned-workouts', {
      data: {
        date: '2026-07-31T08:00:00.000Z',
        title: 'E2E Workout To Delete',
        type: 'Ride'
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const created = await createRes.json()
    const workoutId = (created.workout || created).id

    // Delete workout
    const deleteRes = await authedPage.request.delete(`/api/planned-workouts/${workoutId}`)
    expect(deleteRes.ok()).toBeTruthy()

    // Assert deleted from database
    const deletedRecord = await prisma.plannedWorkout.findUnique({
      where: { id: workoutId }
    })
    expect(deletedRecord).toBeNull()
  })
})
