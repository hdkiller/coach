import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workoutTools } from '../../../../../server/utils/ai-tools/workouts'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { prisma } from '../../../../../server/utils/db'

// Mock the repository
vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn(),
    getById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutStreamRepository', () => ({
  attachStreamToWorkout: vi.fn(async (workout) => ({ ...workout, streams: null }))
}))

// Mock prisma
vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workout: {
      findFirst: vi.fn()
    },
    plannedWorkout: {
      findFirst: vi.fn()
    }
  }
}))

describe('workoutTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = workoutTools(userId, timezone, {
    aiRequireToolApproval: false
  } as any)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get_recent_workouts', () => {
    it('should return workouts summary', async () => {
      const mockWorkouts = [
        {
          id: 'w1',
          date: new Date('2023-01-01'),
          title: 'Morning Ride',
          source: 'strava',
          type: 'Ride',
          durationSec: 3600,
          tss: 60,
          intensity: 0.65,
          rpe: 5,
          feel: 3
        }
      ]

      vi.mocked(workoutRepository.getForUser).mockResolvedValue(mockWorkouts as any)

      const result = await tools.get_recent_workouts.execute(
        { limit: 1 },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getForUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ limit: 1 })
      )
      expect(result).toEqual({
        count: 1,
        workouts: [
          {
            id: 'w1',
            date: expect.any(String), // formatUserDate result
            title: 'Morning Ride',
            sport: 'Ride',
            duration: 3600,
            tss: 60,
            intensity: 0.65,
            rpe: 5,
            feel: 3
          }
        ]
      })
    })
  })

  describe('get_workout_details', () => {
    it('should return workout details when found', async () => {
      const mockWorkout = {
        id: 'w1',
        userId,
        date: new Date('2023-01-01'),
        title: 'Hard Intervals',
        type: 'Ride'
      }

      vi.mocked(workoutRepository.getById).mockResolvedValue(mockWorkout as any)

      const result = await tools.get_workout_details.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getById).toHaveBeenCalledWith('w1', userId, {
        include: {
          plannedWorkout: true
        }
      })
      expect(result).toEqual({
        ...mockWorkout,
        date: expect.any(String),
        streams: null
      })
    })

    it('should return planned workout when completed workout not found but planned exists', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)
      const mockPlanned = {
        id: 'w1',
        userId,
        date: new Date('2023-01-01'),
        title: 'Planned Ride',
        trainingWeek: { id: 'week-1' }
      }
      vi.mocked(prisma.plannedWorkout.findFirst).mockResolvedValue(mockPlanned as any)

      const result = await tools.get_workout_details.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.plannedWorkout.findFirst).toHaveBeenCalledWith({
        where: { id: 'w1', userId },
        include: { trainingWeek: true }
      })
      expect(result).toEqual({
        ...mockPlanned,
        isPlanned: true,
        date: expect.any(String)
      })
    })

    it('should return error when workout not found', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)
      vi.mocked(prisma.plannedWorkout.findFirst).mockResolvedValue(null)

      const result = await tools.get_workout_details.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Workout not found' })
    })

    it('falls back to a degraded prisma fetch when the primary fetch throws', async () => {
      vi.mocked(workoutRepository.getById).mockRejectedValue(new Error('relation load failed'))
      vi.mocked(prisma.workout.findFirst).mockResolvedValue({
        id: 'w1',
        userId,
        date: new Date('2023-01-01'),
        title: 'Hard Intervals',
        type: 'Ride',
        streams: null
      } as any)

      const result = await tools.get_workout_details.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.workout.findFirst).toHaveBeenCalled()
      expect(result).toEqual({
        id: 'w1',
        userId,
        date: expect.any(String),
        title: 'Hard Intervals',
        type: 'Ride',
        streams: null,
        degraded: true
      })
    })
  })

  describe('search_workouts', () => {
    it('should search across the full local day (UTC timezone) when a date is provided', async () => {
      vi.mocked(workoutRepository.getForUser).mockResolvedValue([
        {
          id: 'blur-ride',
          date: new Date('2025-07-29T14:32:00Z'),
          title: 'Blur',
          type: 'Ride',
          durationSec: 5400,
          tss: 88,
          calories: 1200,
          tags: ['outdoor']
        }
      ] as any)

      const result = await tools.search_workouts.execute(
        { date: '2025-07-29', title_search: 'Blur' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getForUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          limit: 5,
          orderBy: { date: 'desc' },
          where: expect.objectContaining({
            title: { contains: 'Blur', mode: 'insensitive' },
            date: {
              gte: new Date('2025-07-29T00:00:00.000Z'),
              lte: new Date('2025-07-29T23:59:59.999Z')
            }
          })
        })
      )
      expect(result).toEqual([
        {
          id: 'blur-ride',
          date: expect.any(String),
          title: 'Blur',
          sport: 'Ride',
          tags: ['outdoor'],
          duration: 5400,
          tss: 88,
          calories: 1200
        }
      ])
    })

    it('should use the athlete local-day boundaries (not raw UTC) when timezone is behind UTC', async () => {
      // America/Los_Angeles is UTC-7 in late July (PDT). A late-evening
      // workout on the LA calendar day 2025-07-29 lands on 2025-07-30 in UTC.
      // Raw UTC day boundaries for "2025-07-29" would miss it entirely; the
      // correct LA-local boundaries must span into 2025-07-30 UTC.
      const laTools = workoutTools(userId, 'America/Los_Angeles', {
        aiRequireToolApproval: false
      } as any)

      vi.mocked(workoutRepository.getForUser).mockResolvedValue([])

      await laTools.search_workouts.execute(
        { date: '2025-07-29' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getForUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2025-07-29T07:00:00.000Z'),
              lte: new Date('2025-07-30T06:59:59.999Z')
            }
          })
        })
      )
    })
  })

  describe('get_workout_analysis', () => {
    it('omits the duplicate markdown report when structured analysis is available', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue({
        id: 'w1',
        title: 'Afternoon Ride',
        date: new Date('2026-07-18T12:00:00Z'),
        aiAnalysis: '# Full duplicate markdown report',
        aiAnalysisJson: {
          executive_summary: 'Strong workout with late-session fade.'
        },
        aiAnalysisStatus: 'COMPLETED',
        overallScore: 6
      } as any)

      const result = await tools.get_workout_analysis.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toMatchObject({
        id: 'w1',
        title: 'Afternoon Ride',
        date: expect.any(String),
        aiAnalysisJson: {
          executive_summary: 'Strong workout with late-session fade.'
        },
        overallScore: 6
      })
      expect(result).not.toHaveProperty('aiAnalysis')
    })

    it('keeps the markdown report when no structured analysis is available', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue({
        id: 'w1',
        title: 'Afternoon Ride',
        date: new Date('2026-07-18T12:00:00Z'),
        aiAnalysis: '# Legacy workout report',
        aiAnalysisJson: null,
        aiAnalysisStatus: 'COMPLETED'
      } as any)

      const result = await tools.get_workout_analysis.execute(
        { workout_id: 'w1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toMatchObject({
        aiAnalysis: '# Legacy workout report',
        aiAnalysisJson: null
      })
    })
  })

  describe('update_workout', () => {
    it('reports that completed workout edits are local only', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue({
        id: 'w1',
        userId,
        title: 'Morning Ride',
        type: 'Ride',
        date: new Date('2026-07-24T08:00:00Z'),
        durationSec: 3600,
        tss: 58
      } as any)
      vi.mocked(workoutRepository.update).mockResolvedValue({
        id: 'w1',
        title: 'Morning Ride',
        type: 'Ride',
        date: new Date('2026-07-24T08:00:00Z'),
        durationSec: 3600,
        tss: 110
      } as any)

      const result = await tools.update_workout.execute(
        { workout_id: 'w1', tss: 110 },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toMatchObject({
        success: true,
        entity_type: 'completed_workout',
        sync_scope: 'local_only',
        message: expect.stringContaining('Intervals.icu activity metrics are not changed')
      })
    })

    it('does not route planned workout IDs through the completed workout tool', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)

      const result = await tools.update_workout.execute(
        { workout_id: 'planned-1', tss: 80 },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({
        error:
          'Completed workout not found. Planned workouts must be changed with the planned-workout tools.'
      })
      expect(workoutRepository.update).not.toHaveBeenCalled()
    })
  })
})
