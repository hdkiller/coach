import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workoutTools } from '../../../../../server/utils/ai-tools/workouts'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    getById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutStreamRepository', () => ({
  attachStreamToWorkout: vi.fn(async (workout) => ({ ...workout, streams: null }))
}))

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

describe('update_workout_notes tool', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = workoutTools(userId, timezone, {} as any)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('completed workout', () => {
    it('appends notes to completed workout by default', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue({
        id: 'workout-1',
        userId,
        notes: 'Initial notes'
      } as any)
      vi.mocked(workoutRepository.update).mockResolvedValue({} as any)

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'workout-1', notes: 'Felt strong on intervals' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getById).toHaveBeenCalledWith('workout-1', userId)
      expect(workoutRepository.update).toHaveBeenCalledWith('workout-1', {
        notes: 'Initial notes\n\nFelt strong on intervals',
        notesUpdatedAt: expect.any(Date)
      })
      expect(result).toEqual({
        success: true,
        message: 'Workout notes update prepared (APPEND).'
      })
    })

    it('replaces notes on completed workout when mode is REPLACE', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue({
        id: 'workout-1',
        userId,
        notes: 'Initial notes'
      } as any)
      vi.mocked(workoutRepository.update).mockResolvedValue({} as any)

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'workout-1', notes: 'Replaced notes', mode: 'REPLACE' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.update).toHaveBeenCalledWith('workout-1', {
        notes: 'Replaced notes',
        notesUpdatedAt: expect.any(Date)
      })
      expect(result).toEqual({
        success: true,
        message: 'Workout notes update prepared (REPLACE).'
      })
    })
  })

  describe('planned workout', () => {
    it('appends notes/description to planned workout when completed workout is not found', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'planned-1',
        userId,
        description: 'Planned target: 4x5min VO2max'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({} as any)

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'planned-1', notes: 'Remember to warm up well' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getById).toHaveBeenCalledWith('planned-1', userId)
      expect(plannedWorkoutRepository.getById).toHaveBeenCalledWith('planned-1', userId)
      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith('planned-1', userId, {
        description: 'Planned target: 4x5min VO2max\n\nRemember to warm up well'
      })
      expect(result).toEqual({
        success: true,
        message: 'Workout notes update prepared (APPEND).'
      })
    })

    it('replaces description on planned workout when mode is REPLACE', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'planned-1',
        userId,
        description: 'Old description'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({} as any)

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'planned-1', notes: 'New description', mode: 'REPLACE' },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith('planned-1', userId, {
        description: 'New description'
      })
      expect(result).toEqual({
        success: true,
        message: 'Workout notes update prepared (REPLACE).'
      })
    })
  })

  describe('not found / error handling', () => {
    it('returns error if workout is found in neither Workout nor PlannedWorkout', async () => {
      vi.mocked(workoutRepository.getById).mockResolvedValue(null)
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue(null)

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'unknown-id', notes: 'Some notes' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Workout not found' })
    })

    it('handles repository errors gracefully', async () => {
      vi.mocked(workoutRepository.getById).mockRejectedValue(new Error('DB failure'))

      const result = await tools.update_workout_notes.execute(
        { workout_id: 'workout-1', notes: 'Some notes' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Failed to update notes: DB failure' })
    })
  })
})
