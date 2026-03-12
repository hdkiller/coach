import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import {
  autoUploadPlannedWorkoutToIntervalsIfEnabled,
  syncPlannedWorkoutToIntervals
} from '../../../../../server/utils/intervals-sync'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getRouterParam', (_event: any, key: string) => _event.context.params[key])
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    activityRecommendation: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    plannedWorkout: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  tasks: {
    trigger: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/intervals-sync', () => ({
  autoUploadPlannedWorkoutToIntervalsIfEnabled: vi.fn(),
  syncPlannedWorkoutToIntervals: vi.fn()
}))

vi.mock('../../../../../server/utils/intervals', () => ({
  isIntervalsEventId: vi.fn(() => false)
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/recommendations/[id]/accept.post')
  return mod.default
}

describe('POST /api/recommendations/[id]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(autoUploadPlannedWorkoutToIntervalsIfEnabled).mockResolvedValue({
      attempted: false,
      synced: false
    })
    vi.mocked(syncPlannedWorkoutToIntervals).mockResolvedValue({
      success: true,
      synced: true
    } as any)
  })

  it('falls back to a rest-day title when the recommendation omits new_title', async () => {
    const handler = await getHandler()

    vi.mocked(prisma.activityRecommendation.findUnique).mockResolvedValue({
      id: 'rec-1',
      userId: 'user-1',
      date: new Date('2026-03-12T00:00:00Z'),
      userAccepted: false,
      plannedWorkoutId: 'planned-1',
      analysisJson: {
        suggested_modifications: {
          description: 'Take the rest of the day off.',
          new_type: 'Rest',
          new_duration_min: 0,
          new_tss: 0
        }
      },
      plannedWorkout: {
        id: 'planned-1',
        title: 'Long Endurance Ride',
        completed: true,
        completionStatus: 'COMPLETED',
        completedWorkouts: [{ id: 'done-1' }],
        syncStatus: 'LOCAL_ONLY'
      }
    } as any)

    vi.mocked(prisma.plannedWorkout.create).mockResolvedValue({
      id: 'planned-2',
      type: 'Rest',
      syncStatus: 'LOCAL_ONLY',
      externalId: 'ai_gen_user-1_2026-03-12_1',
      date: new Date('2026-03-12T00:00:00Z'),
      title: 'Rest Day',
      description: 'Take the rest of the day off.',
      durationSec: 0,
      tss: 0,
      managedBy: 'COACH_WATTS'
    } as any)

    const result = await handler({ context: { params: { id: 'rec-1' } } } as any)

    expect(prisma.plannedWorkout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Rest Day',
        type: 'Rest',
        durationSec: 0,
        tss: 0
      })
    })
    expect(tasks.trigger).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: true,
      message: 'Workout updated successfully'
    })
  })
})
