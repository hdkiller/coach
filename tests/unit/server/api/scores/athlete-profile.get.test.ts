import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { pbDetectionService } from '../../../../../server/utils/services/pbDetectionService'

import { requireAuth } from '../../../../../server/utils/auth-guard'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getHeader', (event: any, name: string) => event.headers?.[name])
vi.stubGlobal('getCookie', (event: any, name: string) => event.cookies?.[name])
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    workout: {
      findMany: vi.fn()
    },
    personalBest: {
      findMany: vi.fn()
    },
    report: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/services/pbDetectionService', () => ({
  pbDetectionService: {
    detectPBs: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/scores/athlete-profile.get')
  return mod.default
}

describe('GET /api/scores/athlete-profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1', email: 'athlete@example.com' } as any)
    vi.mocked(prisma.report.findMany).mockResolvedValue([] as any)
    vi.mocked(pbDetectionService.detectPBs).mockResolvedValue([] as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-1' } as any)
  })

  it('backfills legacy personal bests once before returning trophy case data', async () => {
    const initialUser = {
      id: 'user-1',
      name: 'Tom',
      ftp: 280,
      weight: 70,
      maxHr: 190,
      nutritionTrackingEnabled: true,
      personalBestsBackfilledAt: null,
      currentFitnessScore: 90,
      recoveryCapacityScore: 88,
      nutritionComplianceScore: 80,
      trainingConsistencyScore: 92,
      profileLastUpdated: new Date('2026-03-19T12:00:00Z'),
      currentFitnessExplanation: null,
      recoveryCapacityExplanation: null,
      nutritionComplianceExplanation: null,
      trainingConsistencyExplanation: null,
      currentFitnessExplanationJson: null,
      recoveryCapacityExplanationJson: null,
      nutritionComplianceExplanationJson: null,
      trainingConsistencyExplanationJson: null,
      personalBests: [
        {
          id: 'pb-recent',
          type: 'RUN_5K',
          category: 'RUN',
          value: 1200,
          unit: 's',
          date: new Date('2025-08-01T00:00:00Z'),
          workoutId: 'workout-recent',
          metadata: null,
          workout: {
            averageHr: 165,
            averageCadence: 178
          }
        }
      ]
    }

    const refreshedPersonalBests = [
      {
        id: 'pb-all-time',
        type: 'RUN_5K',
        category: 'RUN',
        value: 1180,
        unit: 's',
        date: new Date('2023-04-15T00:00:00Z'),
        workoutId: 'workout-old',
        metadata: null,
        workout: {
          averageHr: 168,
          averageCadence: 180
        }
      }
    ]

    vi.mocked(prisma.user.findUnique).mockResolvedValue(initialUser as any)
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: 'workout-old',
        userId: 'user-1',
        type: 'Run',
        date: new Date('2023-04-15T00:00:00Z'),
        elevationGain: 90,
        averageHr: 168,
        averageCadence: 180,
        maxHr: 192,
        maxCadence: 194,
        streams: {
          time: [0, 1180],
          distance: [0, 5000]
        }
      }
    ] as any)
    vi.mocked(prisma.personalBest.findMany).mockResolvedValue(refreshedPersonalBests as any)

    const handler = await getHandler()
    const result = await handler({} as any)

    expect(prisma.workout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isDuplicate: false
        }),
        orderBy: { date: 'asc' }
      })
    )
    expect(pbDetectionService.detectPBs).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workout-old'
      }),
      prisma
    )
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { personalBestsBackfilledAt: expect.any(Date) }
    })
    expect(result.personalBests).toEqual(refreshedPersonalBests)
  })
})
