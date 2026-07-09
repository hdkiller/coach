import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import {
  formatDateUTC,
  getEndOfDayUTC,
  getEndOfLocalDateUTC,
  getStartOfDayUTC,
  getStartOfLocalDateUTC,
  getTimestampDateKey,
  getUserLocalDate
} from '../../../../../server/utils/date'
import { nutritionRepository } from '../../../../../server/utils/repositories/nutritionRepository'
import { wellnessRepository } from '../../../../../server/utils/repositories/wellnessRepository'
import { calendarNoteRepository } from '../../../../../server/utils/repositories/calendarNoteRepository'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
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
    user: {
      findUnique: vi.fn()
    },
    dailyMetric: {
      findMany: vi.fn()
    },
    plannedWorkout: {
      findMany: vi.fn()
    },
    goal: {
      findMany: vi.fn()
    },
    metricHistory: {
      findMany: vi.fn()
    },
    personalBest: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/date', () => ({
  formatDateUTC: vi.fn((date: Date, _format?: string) => date.toISOString().split('T')[0]),
  getUserLocalDate: vi.fn(),
  getTimestampDateKey: vi.fn(),
  getStartOfDayUTC: vi.fn(),
  getEndOfDayUTC: vi.fn(),
  getStartOfLocalDateUTC: vi.fn(),
  getEndOfLocalDateUTC: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/nutritionRepository', () => ({
  nutritionRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/calendarNoteRepository', () => ({
  calendarNoteRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    getMetabolicStatesForRange: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/bodyMetricResolver', () => ({
  bodyMetricResolver: {
    resolveEffectiveWeight: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/calendar-notes', () => ({
  getCalendarNoteDisplayEndDate: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/calendar/index.get')
  return mod.default
}

describe('GET /api/calendar threshold milestones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      timezone: 'UTC',
      weight: 72,
      weightSourceMode: 'PROFILE',
      ftp: 250,
      nutritionTrackingEnabled: false
    } as any)
    vi.mocked(getUserLocalDate).mockReturnValue(new Date('2026-03-12T00:00:00Z'))
    vi.mocked(getStartOfDayUTC).mockImplementation((_tz: string, date: Date) => date)
    vi.mocked(getEndOfDayUTC).mockImplementation((_tz: string, date: Date) => date)
    vi.mocked(getStartOfLocalDateUTC).mockImplementation((_tz: string, dateStr: string) => {
      return new Date(`${dateStr}T00:00:00.000Z`)
    })
    vi.mocked(getEndOfLocalDateUTC).mockImplementation((_tz: string, dateStr: string) => {
      return new Date(`${dateStr}T23:59:59.999Z`)
    })
    vi.mocked(getTimestampDateKey).mockImplementation(
      (date: Date) => date.toISOString().split('T')[0]
    )
    vi.mocked(nutritionRepository.getForUser).mockResolvedValue([] as any)
    vi.mocked(wellnessRepository.getForUser).mockResolvedValue([] as any)
    vi.mocked(calendarNoteRepository.getForUser).mockResolvedValue([] as any)
    vi.mocked(workoutRepository.getForUser).mockResolvedValue([] as any)
    vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.goal.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.personalBest.findMany).mockResolvedValue([] as any)
  })

  it('returns threshold milestones on the workout date with sport-specific titles', async () => {
    const handler = await getHandler()
    const workoutDate = new Date('2025-02-05T10:00:00Z')

    vi.mocked(prisma.metricHistory.findMany).mockResolvedValue([
      {
        id: 'mh-1',
        type: 'FTP',
        value: 266,
        oldValue: 250,
        date: workoutDate,
        sportProfileName: 'Cycling',
        notes: 'Detected for Cycling profile.'
      }
    ] as any)

    const result = await handler({
      query: {
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-02-10T00:00:00Z'
      }
    } as any)

    expect(result.activities).toEqual([
      expect.objectContaining({
        id: 'mh-1',
        source: 'threshold',
        date: workoutDate.toISOString(),
        title: 'Cycling FTP: 250 → 266W',
        sportProfileName: 'Cycling'
      })
    ])
  })

  it('queries planned workouts using the viewer-local UTC range', async () => {
    const handler = await getHandler()

    vi.mocked(getStartOfLocalDateUTC).mockReturnValue(new Date('2026-07-16T04:00:00.000Z'))
    vi.mocked(getEndOfLocalDateUTC).mockReturnValue(new Date('2026-07-20T03:59:59.999Z'))

    await handler({
      query: {
        startDate: '2026-07-16T00:00:00Z',
        endDate: '2026-07-19T00:00:00Z'
      }
    } as any)

    expect(prisma.plannedWorkout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          date: {
            gte: new Date('2026-07-16T04:00:00.000Z'),
            lte: new Date('2026-07-20T03:59:59.999Z')
          }
        })
      })
    )
  })
})
