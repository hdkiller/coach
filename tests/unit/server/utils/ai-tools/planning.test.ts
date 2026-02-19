import { beforeEach, describe, expect, it, vi } from 'vitest'
import { planningTools } from '../../../../../server/utils/ai-tools/planning'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'

vi.mock('../../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    getById: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getById: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

describe('planningTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = planningTools(userId, timezone, { aiRequireToolApproval: false } as any)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get_planned_workout_structure', () => {
    it('returns structure payload when found', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        title: 'VO2 Session',
        date: new Date('2026-02-20T00:00:00Z'),
        type: 'Ride',
        durationSec: 3600,
        updatedAt: new Date('2026-02-14T12:00:00Z'),
        structuredWorkout: {
          description: 'VO2 repeats',
          steps: [{ type: 'Warmup', name: '10m easy' }]
        }
      } as any)

      const result = await tools.get_planned_workout_structure.execute(
        { workout_id: 'pw-1' },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.getById).toHaveBeenCalledWith('pw-1', userId, {
        select: {
          id: true,
          title: true,
          date: true,
          type: true,
          durationSec: true,
          structuredWorkout: true,
          updatedAt: true
        }
      })
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          workout_id: 'pw-1',
          has_structure: true,
          structured_workout: expect.any(Object)
        })
      )
    })

    it('returns not found error for unknown workout', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue(null)

      const result = await tools.get_planned_workout_structure.execute(
        { workout_id: 'missing' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Planned workout not found' })
    })
  })

  describe('set_planned_workout_structure', () => {
    it('updates structure and marks sync pending for synced workouts', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        syncStatus: 'SYNCED'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-1',
        structuredWorkout: {
          description: 'Updated structure',
          steps: [{ type: 'Active', name: '4x5m' }]
        }
      } as any)

      const result = await tools.set_planned_workout_structure.execute(
        {
          workout_id: 'pw-1',
          structured_workout: {
            description: 'Updated structure',
            steps: [{ type: 'Active', name: '4x5m' }]
          }
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-1',
        userId,
        expect.objectContaining({
          modifiedLocally: true,
          syncStatus: 'PENDING',
          syncError: null
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          workout_id: 'pw-1',
          status: 'QUEUED_FOR_SYNC'
        })
      )
    })

    it('keeps LOCAL_ONLY status for local workouts', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-local',
        syncStatus: 'LOCAL_ONLY'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-local',
        structuredWorkout: { steps: [{ type: 'Warmup', name: '10m' }] }
      } as any)

      await tools.set_planned_workout_structure.execute(
        {
          workout_id: 'pw-local',
          structured_workout: { steps: [{ type: 'Warmup', name: '10m' }] }
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-local',
        userId,
        expect.objectContaining({
          syncStatus: 'LOCAL_ONLY'
        })
      )
    })

    it('normalizes legacy repeat fields into reps', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-repeat',
        syncStatus: 'SYNCED'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-repeat',
        structuredWorkout: {
          steps: [{ name: 'Main Set', steps: [{ name: 'On' }], reps: 4 }]
        }
      } as any)

      await tools.set_planned_workout_structure.execute(
        {
          workout_id: 'pw-repeat',
          structured_workout: {
            steps: [{ name: 'Main Set', steps: [{ name: 'On' }], type: 'Repeat', repeat: 4 }]
          }
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-repeat',
        userId,
        expect.objectContaining({
          structuredWorkout: expect.objectContaining({
            steps: [
              expect.objectContaining({
                reps: 4
              })
            ]
          })
        })
      )
    })
  })

  describe('patch_planned_workout_structure', () => {
    it('replaces a nested step field', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        syncStatus: 'SYNCED',
        structuredWorkout: {
          steps: [{ type: 'Warmup', name: 'Easy start' }],
          coachInstructions: 'Old'
        }
      } as any)

      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-1',
        structuredWorkout: {
          steps: [{ type: 'Warmup', name: 'Revised warmup' }],
          coachInstructions: 'Old'
        }
      } as any)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-1',
          operations: [{ op: 'replace', path: 'steps.0.name', value: 'Revised warmup' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-1',
        userId,
        expect.objectContaining({
          modifiedLocally: true,
          syncStatus: 'PENDING',
          syncError: null
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          applied_operations: 1
        })
      )
    })

    it('adds and removes items in arrays', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-2',
        syncStatus: 'LOCAL_ONLY',
        structuredWorkout: {
          messages: ['A', 'B'],
          exercises: [{ name: 'Squat' }]
        }
      } as any)

      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-2',
        structuredWorkout: {
          messages: ['A', 'C'],
          exercises: [{ name: 'Squat' }, { name: 'Lunge' }]
        }
      } as any)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-2',
          operations: [
            { op: 'remove', path: 'messages.1' },
            { op: 'add', path: 'messages.1', value: 'C' },
            { op: 'add', path: 'exercises.1', value: { name: 'Lunge' } }
          ]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-2',
        userId,
        expect.objectContaining({
          syncStatus: 'LOCAL_ONLY'
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          status: 'LOCAL_ONLY',
          applied_operations: 3
        })
      )
    })

    it('returns error when structure is missing', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-3',
        syncStatus: 'SYNCED',
        structuredWorkout: null
      } as any)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-3',
          operations: [{ op: 'replace', path: 'steps.0.name', value: 'x' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({
        success: false,
        error: 'No structured workout exists yet. Use generate or set first.'
      })
    })

    it('returns error for invalid patch path', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-4',
        syncStatus: 'SYNCED',
        structuredWorkout: { steps: [{ type: 'Warmup', name: 'Easy' }] }
      } as any)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-4',
          operations: [{ op: 'replace', path: 'steps.99.name', value: 'x' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('out of bounds')
        })
      )
      expect(plannedWorkoutRepository.update).not.toHaveBeenCalled()
    })

    it('normalizes repeat field after patch operations', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-5',
        syncStatus: 'SYNCED',
        structuredWorkout: {
          steps: [{ type: 'Active', name: 'Main', steps: [{ type: 'Active', name: 'Work' }] }]
        }
      } as any)

      vi.mocked(plannedWorkoutRepository.update).mockResolvedValue({
        id: 'pw-5',
        structuredWorkout: {
          steps: [
            { type: 'Active', name: 'Main', steps: [{ type: 'Active', name: 'Work' }], reps: 4 }
          ]
        }
      } as any)

      await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-5',
          operations: [{ op: 'add', path: 'steps.0.repeat', value: 4 }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-5',
        userId,
        expect.objectContaining({
          structuredWorkout: expect.objectContaining({
            steps: [
              expect.objectContaining({
                reps: 4
              })
            ]
          })
        })
      )
    })
  })

  describe('reschedule_planned_workout', () => {
    it('reschedules by workout_id', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValueOnce({
        id: 'pw-r1',
        title: 'Tempo Ride',
        date: new Date('2026-02-20T00:00:00Z'),
        startTime: '08:00',
        syncStatus: 'SYNCED'
      } as any)
      vi.mocked(plannedWorkoutRepository.update).mockResolvedValueOnce({
        id: 'pw-r1',
        date: new Date('2026-02-21T00:00:00Z'),
        startTime: '09:30'
      } as any)

      const result = await tools.reschedule_planned_workout.execute(
        {
          workout_id: 'pw-r1',
          new_date: '2026-02-21',
          new_time_of_day: '09:30'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.update).toHaveBeenCalledWith(
        'pw-r1',
        userId,
        expect.objectContaining({
          modifiedLocally: true,
          syncStatus: 'PENDING',
          syncError: null,
          startTime: '09:30'
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          workout_id: 'pw-r1',
          previous_date: '2026-02-20',
          new_date: '2026-02-21',
          status: 'QUEUED_FOR_SYNC'
        })
      )
    })

    it('returns matches when lookup is ambiguous', async () => {
      vi.mocked(plannedWorkoutRepository.list).mockResolvedValueOnce([
        {
          id: 'pw-a',
          date: new Date('2026-02-20T00:00:00Z'),
          startTime: '08:00',
          title: 'Endurance Ride'
        },
        {
          id: 'pw-b',
          date: new Date('2026-02-20T00:00:00Z'),
          startTime: '10:00',
          title: 'Endurance Ride'
        }
      ] as any)

      const result = await tools.reschedule_planned_workout.execute(
        {
          current_date: '2026-02-20',
          title_contains: 'endurance',
          new_date: '2026-02-21'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Multiple planned workouts matched. Please provide workout_id.',
          matches: expect.arrayContaining([
            expect.objectContaining({ workout_id: 'pw-a' }),
            expect.objectContaining({ workout_id: 'pw-b' })
          ])
        })
      )
      expect(plannedWorkoutRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('delete_planned_workout', () => {
    it('regenerates fueling plan after deleting a planned workout', async () => {
      const workoutDate = new Date('2026-02-19T00:00:00Z')
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValueOnce({
        id: 'pw-del',
        date: workoutDate
      } as any)
      vi.mocked(plannedWorkoutRepository.delete).mockResolvedValueOnce({ id: 'pw-del' } as any)
      vi.mocked(metabolicService.calculateFuelingPlanForDate).mockResolvedValueOnce({
        success: true
      } as any)

      const result = await tools.delete_planned_workout.execute(
        { workout_id: 'pw-del' },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.getById).toHaveBeenCalledWith('pw-del', userId, {
        select: { id: true, date: true }
      })
      expect(plannedWorkoutRepository.delete).toHaveBeenCalledWith('pw-del', userId)
      expect(metabolicService.calculateFuelingPlanForDate).toHaveBeenCalledWith(userId, workoutDate, {
        persist: true
      })
      expect(result).toEqual({
        success: true,
        message: 'Planned workout deleted.'
      })
    })
  })
})
