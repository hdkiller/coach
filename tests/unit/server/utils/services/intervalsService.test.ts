import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../../server/utils/db'
import { normalizeIntervalsWorkout } from '../../../../../server/utils/intervals'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { deduplicateWorkoutsTask } from '../../../../../trigger/deduplicate-workouts'
import { IntervalsService } from '../../../../../server/utils/services/intervalsService'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    integration: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    plannedWorkout: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn()
    },
    user: { findUnique: vi.fn(), update: vi.fn() },
    workout: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    workoutStream: { upsert: vi.fn() }
  }
}))

vi.mock('../../../../../server/utils/intervals', () => ({
  fetchIntervalsAthleteProfile: vi.fn(),
  fetchIntervalsWorkouts: vi.fn(),
  fetchIntervalsActivity: vi.fn(),
  fetchIntervalsWellness: vi.fn(),
  fetchIntervalsPlannedWorkouts: vi.fn(),
  normalizeIntervalsWorkout: vi.fn((activity: any, userId: string) => ({
    userId,
    externalId: String(activity.id),
    source: 'intervals',
    date: new Date(activity.start_date || activity.start_date_local || '2026-01-01T00:00:00Z'),
    title: activity.name || 'Workout',
    type: activity.type || 'Other',
    durationSec: activity.moving_time || 0
  })),
  normalizeIntervalsWellness: vi.fn(),
  normalizeIntervalsPlannedWorkout: vi.fn(),
  normalizeIntervalsCalendarNote: vi.fn(),
  fetchIntervalsActivityStreams: vi.fn(),
  fetchIntervalsAthlete: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    upsert: vi.fn(),
    getByExternalId: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/normalize-tss', () => ({
  normalizeTSS: vi.fn().mockResolvedValue({ tss: null })
}))

vi.mock('../../../../../server/utils/calculate-workout-stress', () => ({
  calculateWorkoutStress: vi.fn()
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn().mockResolvedValue('UTC'),
  getEndOfDayUTC: vi.fn((_: string, d: Date) => d),
  getStartOfDayUTC: vi.fn(
    (_: string, d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  )
}))

vi.mock('../../../../../server/utils/services/wellness-analysis', () => ({
  triggerReadinessCheckIfNeeded: vi.fn()
}))

vi.mock('../../../../../trigger/deduplicate-workouts', () => ({
  deduplicateWorkoutsTask: {
    trigger: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('../../../../../trigger/queues', () => ({
  userIngestionQueue: {
    trigger: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('IntervalsService ACTIVITY_UPDATED', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deduplicateWorkoutsTask.trigger).mockResolvedValue(undefined as any)
  })

  it('uses payload-first upsert when ACTIVITY_UPDATED includes full activity date', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue(null as any)
    vi.mocked(workoutRepository.upsert).mockResolvedValue({
      record: { id: 'w-rich' } as any,
      isNew: false
    })

    const syncSpy = vi.spyOn(IntervalsService, 'syncActivities').mockResolvedValue(0)
    const streamSpy = vi
      .spyOn(IntervalsService, 'syncActivityStream')
      .mockResolvedValue(null as any)

    const event = {
      activity: {
        id: 'i123',
        name: 'Tempo Run',
        type: 'Run',
        start_date: '2026-01-21T19:11:43Z',
        moving_time: 3600,
        stream_types: []
      }
    }

    const result = await IntervalsService.processWebhookEvent(userId, 'ACTIVITY_UPDATED', event)

    expect(result.handled).toBe(true)
    expect(normalizeIntervalsWorkout).toHaveBeenCalledWith(event.activity, userId)
    expect(workoutRepository.upsert).toHaveBeenCalledTimes(1)
    expect(syncSpy).not.toHaveBeenCalled()
    expect(streamSpy).not.toHaveBeenCalled()
    expect(deduplicateWorkoutsTask.trigger).toHaveBeenCalledTimes(1)

    syncSpy.mockRestore()
    streamSpy.mockRestore()
  })

  it('applies delta update without sync when payload is thin but workout exists', async () => {
    vi.mocked(workoutRepository.getByExternalId).mockResolvedValue({
      id: 'w-thin',
      rawJson: { existing: true }
    } as any)

    const syncSpy = vi.spyOn(IntervalsService, 'syncActivities').mockResolvedValue(0)

    const event = {
      activity: {
        id: 'i999',
        name: 'Indoor Cycling',
        description: 'Updated title only'
      }
    }

    await IntervalsService.processWebhookEvent(userId, 'ACTIVITY_UPDATED', event)

    expect(workoutRepository.upsert).not.toHaveBeenCalled()
    expect(workoutRepository.update).toHaveBeenCalledTimes(1)
    expect(workoutRepository.update).toHaveBeenCalledWith(
      'w-thin',
      expect.objectContaining({
        title: 'Indoor Cycling',
        description: 'Updated title only',
        rawJson: expect.objectContaining({
          existing: true,
          id: 'i999'
        })
      })
    )
    expect(syncSpy).not.toHaveBeenCalled()
    expect(deduplicateWorkoutsTask.trigger).toHaveBeenCalledTimes(1)

    syncSpy.mockRestore()
  })

  it('skips full sync when payload is thin and workout does not exist locally', async () => {
    vi.mocked(workoutRepository.getByExternalId).mockResolvedValue(null)

    const syncSpy = vi.spyOn(IntervalsService, 'syncActivities').mockResolvedValue(0)

    const event = {
      activity: {
        id: 'i404',
        name: 'Partial payload'
      }
    }

    await IntervalsService.processWebhookEvent(userId, 'ACTIVITY_UPDATED', event)

    expect(workoutRepository.upsert).not.toHaveBeenCalled()
    expect(workoutRepository.update).not.toHaveBeenCalled()
    expect(syncSpy).not.toHaveBeenCalled()
    expect(deduplicateWorkoutsTask.trigger).toHaveBeenCalledTimes(1)

    syncSpy.mockRestore()
  })
})
