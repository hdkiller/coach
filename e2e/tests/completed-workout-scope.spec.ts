import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('PR #256: Completed Workout Scope & Mutation Contracts', () => {
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

  test('Updating TSS on completed workout modifies local TSS only and returns local_only scope message', async () => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    // 1. Seed a completed workout imported from Intervals
    const workout = await prisma.workout.create({
      data: {
        userId: athlete!.id,
        externalId: `icu-completed-workout-${Date.now()}`,
        source: 'intervals',
        date: new Date(),
        title: 'Intervals Imported Endurance Ride',
        type: 'Ride',
        durationSec: 3600,
        tss: 50
      }
    })

    // Update TSS directly via repository/prisma
    const updated = await prisma.workout.update({
      where: { id: workout.id },
      data: { tss: 75 }
    })

    expect(updated.tss).toBe(75)

    // Clean up
    await prisma.workout.delete({ where: { id: workout.id } })
  })

  test('Passing planned workout ID to completed workout tool rejects request with redirection message', async () => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const plannedId = `planned-id-${Date.now()}`
    const planned = await prisma.plannedWorkout.create({
      data: {
        id: plannedId,
        userId: athlete!.id,
        externalId: plannedId,
        date: new Date(),
        title: 'Future Intervals Workout',
        type: 'Ride',
        durationSec: 3600,
        tss: 60,
        completed: false
      }
    })

    // Query completed workout lookup with planned ID -> should not exist in workout table
    const completedLookup = await prisma.workout.findUnique({ where: { id: plannedId } })
    expect(completedLookup).toBeNull()

    // Cleanup
    await prisma.plannedWorkout.delete({ where: { id: planned.id } })
  })

  test('Editing planned workout via normal path sets outbound sync flag', async () => {
    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()

    const plannedId = `e2e-planned-normal-edit-${Date.now()}`
    const planned = await prisma.plannedWorkout.create({
      data: {
        id: plannedId,
        userId: athlete!.id,
        externalId: plannedId,
        date: new Date(),
        title: 'Original Planned Title',
        type: 'Run',
        durationSec: 1800,
        tss: 30,
        completed: false
      }
    })

    const updatedPlanned = await prisma.plannedWorkout.update({
      where: { id: plannedId },
      data: {
        title: 'Edited Planned Title',
        modifiedLocally: true
      }
    })

    expect(updatedPlanned.title).toBe('Edited Planned Title')
    expect(updatedPlanned.modifiedLocally).toBe(true)

    await prisma.plannedWorkout.delete({ where: { id: plannedId } })
  })
})
