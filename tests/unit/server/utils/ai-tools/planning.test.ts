import { beforeEach, describe, expect, it, vi } from 'vitest'
import { planningTools } from '../../../../../server/utils/ai-tools/planning'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'
import { sportSettingsRepository } from '../../../../../server/utils/repositories/sportSettingsRepository'
import { trainingWeekRepository } from '../../../../../server/utils/repositories/trainingWeekRepository'
import { trainingPlanRepository } from '../../../../../server/utils/repositories/trainingPlanRepository'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'
import { planService } from '../../../../../server/utils/services/planService'
import { writeCanonicalPlannedWorkoutStructure } from '../../../../../server/utils/canonical-planned-workout-write'
import { hasActiveStructureGenerationRun } from '../../../../../server/utils/structure-generation-run'
import {
  buildPlannedWorkoutOperationalContext,
  syncManualPlannedWorkoutStructureToIntervalsIfSynced
} from '../../../../../server/utils/planned-workout-manual-structure-edit'
import { publishPlannedWorkoutToIntervals } from '../../../../../server/utils/planned-workout-intervals-publish'

vi.mock('../../../../../server/utils/planned-workout-intervals-publish', () => ({
  publishPlannedWorkoutToIntervals: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/trainingPlanRepository', () => ({
  trainingPlanRepository: {
    getById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/planService', () => ({
  planService: {
    replanStructure: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    getById: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/trainingWeekRepository', () => ({
  trainingWeekRepository: {
    getById: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getById: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/canonical-planned-workout-write', () => ({
  writeCanonicalPlannedWorkoutStructure: vi.fn()
}))

vi.mock('../../../../../server/utils/structure-generation-run', () => ({
  hasActiveStructureGenerationRun: vi.fn()
}))

vi.mock('../../../../../server/utils/planned-workout-manual-structure-edit', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../server/utils/planned-workout-manual-structure-edit')
  >('../../../../../server/utils/planned-workout-manual-structure-edit')
  return {
    ...actual,
    buildPlannedWorkoutOperationalContext: vi.fn(),
    syncManualPlannedWorkoutStructureToIntervalsIfSynced: vi.fn()
  }
})

describe('planningTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = planningTools(userId, timezone, { aiRequireToolApproval: false } as any)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(false)
    vi.mocked(syncManualPlannedWorkoutStructureToIntervalsIfSynced).mockResolvedValue({
      synced: false,
      sync_status: 'PENDING'
    })
    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      ftp: 250,
      lthr: 168,
      maxHr: 185,
      thresholdPace: 2.345,
      hrZones: [],
      powerZones: [],
      paceZones: [],
      targetPolicy: {
        primaryMetric: 'power',
        fallbackOrder: ['power', 'heartRate', 'pace', 'rpe'],
        strictPrimary: true,
        allowMixedTargetsPerStep: false,
        defaultTargetStyle: 'range',
        preferRangesForSteady: true
      },
      targetFormatPolicy: {
        heartRate: { mode: 'percentLthr', preferRange: true },
        power: { mode: 'percentFtp', preferRange: true },
        pace: { mode: 'percentPace', preferRange: true },
        cadence: { mode: 'rpm' }
      }
    } as any)
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

    it('omits zoneProfileSnapshot from chat structure payloads', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        title: 'VO2 Session',
        date: new Date('2026-02-20T00:00:00Z'),
        type: 'Ride',
        durationSec: 3600,
        updatedAt: new Date('2026-02-14T12:00:00Z'),
        structuredWorkout: {
          description: 'VO2 repeats',
          zoneProfileSnapshot: { power: { unit: 'watts', ranges: [] } },
          steps: [
            {
              type: 'Warmup',
              name: '10m easy',
              stroke: 'Free',
              targetSplit: 'x'.repeat(300),
              pace: {
                metric: 'pace',
                units: 'm/s',
                range: { start: 2.5, end: 3.0 },
                rangeMps: { min: 2.5, max: 3.0 },
                relativeToThreshold: { min: 0.6, max: 0.7 }
              }
            }
          ]
        }
      } as any)

      const result = await tools.get_planned_workout_structure.execute(
        { workout_id: 'pw-1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result.structured_workout.zoneProfileSnapshot).toBeUndefined()
      expect(result.structured_workout.steps[0].stroke).toBe('Free')
      expect(result.structured_workout.steps[0].pace.rangeMps).toBeUndefined()
      expect(result.structured_workout.steps[0].targetSplit.endsWith('...')).toBe(true)
      expect(result.structured_workout.steps[0].targetSplit.length).toBeLessThanOrEqual(240)
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

  describe('update_training_week', () => {
    it('requires approval', async () => {
      await expect(tools.update_training_week.needsApproval?.()).resolves.toBe(true)
    })

    it('updates a training week directly by week id', async () => {
      vi.mocked(trainingWeekRepository.getById).mockResolvedValue({
        id: 'tw-1',
        weekNumber: 2,
        startDate: new Date('2026-03-09T00:00:00Z'),
        endDate: new Date('2026-03-15T00:00:00Z'),
        tssTarget: 420,
        volumeTargetMinutes: 510,
        focusKey: 'tempo',
        focusLabel: 'Tempo Build',
        isRecovery: false,
        block: {
          plan: {
            id: 'plan-1',
            userId,
            status: 'ACTIVE',
            name: 'Spring Build'
          }
        }
      } as any)
      vi.mocked(trainingWeekRepository.update).mockResolvedValue({
        id: 'tw-1',
        weekNumber: 2,
        startDate: new Date('2026-03-09T00:00:00Z'),
        endDate: new Date('2026-03-15T00:00:00Z'),
        tssTarget: 480,
        volumeTargetMinutes: 540,
        focusKey: 'threshold',
        focusLabel: 'Threshold Build',
        isRecovery: false
      } as any)

      const result = await tools.update_training_week.execute(
        {
          week_id: 'tw-1',
          tss_target: 480,
          volume_target_minutes: 540,
          focus_key: 'threshold',
          focus_label: 'Threshold Build'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(trainingWeekRepository.getById).toHaveBeenCalledWith('tw-1', {
        include: {
          block: {
            include: {
              plan: {
                select: {
                  id: true,
                  userId: true,
                  status: true,
                  name: true
                }
              }
            }
          }
        }
      })
      expect(trainingWeekRepository.update).toHaveBeenCalledWith(
        'tw-1',
        expect.objectContaining({
          tssTarget: 480,
          volumeTargetMinutes: 540,
          focusKey: 'threshold',
          focusLabel: 'Threshold Build'
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          week: expect.objectContaining({
            id: 'tw-1',
            tss_target: 480,
            volume_target_minutes: 540,
            plan_id: 'plan-1'
          })
        })
      )
    })

    it('resolves the training week from a planned workout id', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        title: 'Long Ride',
        trainingWeekId: 'tw-2'
      } as any)
      vi.mocked(trainingWeekRepository.getById).mockResolvedValue({
        id: 'tw-2',
        block: {
          plan: {
            id: 'plan-2',
            userId,
            status: 'ACTIVE',
            name: null
          }
        }
      } as any)
      vi.mocked(trainingWeekRepository.update).mockResolvedValue({
        id: 'tw-2',
        weekNumber: 3,
        startDate: new Date('2026-03-16T00:00:00Z'),
        endDate: new Date('2026-03-22T00:00:00Z'),
        tssTarget: 360,
        volumeTargetMinutes: 420,
        focusKey: null,
        focusLabel: null,
        isRecovery: true
      } as any)

      const result = await tools.update_training_week.execute(
        {
          workout_id: 'pw-1',
          is_recovery: true,
          tss_target: 360
        },
        { toolCallId: '1', messages: [] }
      )

      expect(plannedWorkoutRepository.getById).toHaveBeenCalledWith('pw-1', userId, {
        select: {
          id: true,
          title: true,
          trainingWeekId: true
        }
      })
      expect(trainingWeekRepository.update).toHaveBeenCalledWith(
        'tw-2',
        expect.objectContaining({
          isRecovery: true,
          tssTarget: 360
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          week: expect.objectContaining({
            id: 'tw-2',
            is_recovery: true,
            tss_target: 360
          })
        })
      )
    })

    it('rejects updates without fields', async () => {
      const result = await tools.update_training_week.execute(
        {
          week_id: 'tw-1'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('No training week fields provided')
        })
      )
      expect(trainingWeekRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('set_planned_workout_structure', () => {
    it('accepts common step type aliases at the schema boundary', () => {
      const schema = tools.set_planned_workout_structure.inputSchema as any

      const parsed = schema.parse({
        workout_id: 'pw-alias',
        structured_workout: {
          steps: [
            { type: 'warmup', name: 'Easy start' },
            { type: 'interval', name: 'Main set' },
            { type: 'repeat', repeat: 4, steps: [{ type: 'active', name: 'On' }] },
            { type: 'cooldown', name: 'Easy finish' },
            { type: 'recovery', name: 'Between sets' }
          ]
        }
      })

      expect(parsed.structured_workout.steps).toEqual([
        expect.objectContaining({ type: 'Warmup', name: 'Easy start' }),
        expect.objectContaining({ type: 'Active', name: 'Main set' }),
        expect.objectContaining({
          type: undefined,
          repeat: 4,
          steps: [expect.objectContaining({ type: 'Active', name: 'On' })]
        }),
        expect.objectContaining({ type: 'Cooldown', name: 'Easy finish' }),
        expect.objectContaining({ type: 'Rest', name: 'Between sets' })
      ])
    })

    it('updates structure and marks sync pending for synced workouts', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        title: 'Tempo',
        description: 'Hard',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 3600,
        structuredWorkout: {
          source: 'AI_GENERATION',
          zoneProfileSnapshot: { thresholds: { ftp: 250 } }
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)
      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-1',
          title: 'Tempo',
          description: 'Hard',
          type: 'Ride',
          structuredWorkout: {
            description: 'Updated structure',
            steps: [{ type: 'Active', name: '4x5m' }]
          }
        }
      } as any)
      vi.mocked(syncManualPlannedWorkoutStructureToIntervalsIfSynced).mockResolvedValue({
        synced: true,
        sync_status: 'SYNCED'
      })

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

      expect(writeCanonicalPlannedWorkoutStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          plannedWorkoutId: 'pw-1',
          preservePlannedDuration: 3600
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          workout_id: 'pw-1',
          status: 'SYNCED',
          intervals_synced: true
        })
      )
    })

    it('keeps LOCAL_ONLY status for local workouts', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-local',
        title: 'Easy',
        syncStatus: 'LOCAL_ONLY',
        type: 'Ride',
        durationSec: 1800,
        structuredWorkout: null,
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)
      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-local',
          title: 'Easy',
          type: 'Ride',
          structuredWorkout: { steps: [{ type: 'Warmup', name: '10m' }] }
        }
      } as any)
      vi.mocked(syncManualPlannedWorkoutStructureToIntervalsIfSynced).mockResolvedValue({
        synced: false,
        sync_status: 'LOCAL_ONLY'
      })

      const result = await tools.set_planned_workout_structure.execute(
        {
          workout_id: 'pw-local',
          structured_workout: { steps: [{ type: 'Warmup', name: '10m' }] }
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          status: 'LOCAL_ONLY',
          intervals_synced: false
        })
      )
    })

    it('normalizes legacy repeat fields into reps', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-repeat',
        title: 'Repeats',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 2400,
        structuredWorkout: null,
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)
      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-repeat',
          structuredWorkout: {
            steps: [{ name: 'Main Set', steps: [{ name: 'On' }], reps: 4 }]
          }
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

      expect(writeCanonicalPlannedWorkoutStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          structure: expect.objectContaining({
            steps: [
              expect.objectContaining({
                reps: 4
              })
            ]
          })
        })
      )
    })

    it('rejects the edit when a structure generation run is active for the workout', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-inflight',
        title: 'Tempo',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 3600,
        structuredWorkout: {
          description: 'Existing',
          steps: [{ type: 'Active', name: 'Main' }]
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)
      vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(true)

      const result = await tools.set_planned_workout_structure.execute(
        {
          workout_id: 'pw-inflight',
          structured_workout: {
            description: 'Updated',
            steps: [{ type: 'Active', name: 'Main updated' }]
          }
        },
        { toolCallId: '1', messages: [] }
      )

      expect(hasActiveStructureGenerationRun).toHaveBeenCalledWith('pw-inflight')
      expect(result).toEqual({
        success: false,
        structure_job_in_flight: true,
        error:
          'Structure generation or adjustment is already running for this workout. Wait for it to finish before editing structure directly.'
      })
      expect(writeCanonicalPlannedWorkoutStructure).not.toHaveBeenCalled()
      expect(sportSettingsRepository.getForActivityType).not.toHaveBeenCalled()
    })
  })

  describe('patch_planned_workout_structure', () => {
    it('replaces a nested step field', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-1',
        title: 'Patch test',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 3600,
        structuredWorkout: {
          steps: [{ type: 'Warmup', name: 'Easy start' }],
          coachInstructions: 'Old'
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)

      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-1',
          title: 'Patch test',
          type: 'Ride',
          structuredWorkout: {
            steps: [{ type: 'Warmup', name: 'Revised warmup' }],
            coachInstructions: 'Old'
          }
        }
      } as any)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-1',
          operations: [{ op: 'replace', path: 'steps.0.name', value: 'Revised warmup' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(writeCanonicalPlannedWorkoutStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          plannedWorkoutId: 'pw-1',
          preservePlannedDuration: 3600
        })
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          applied_operations: 1,
          status: 'PENDING'
        })
      )
    })

    it('adds and removes items in arrays', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-2',
        title: 'Strength',
        syncStatus: 'LOCAL_ONLY',
        type: 'WeightTraining',
        durationSec: 1800,
        structuredWorkout: {
          messages: ['A', 'B'],
          exercises: [{ name: 'Squat' }]
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)

      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-2',
          structuredWorkout: {
            messages: ['A', 'C'],
            exercises: [{ name: 'Squat' }, { name: 'Lunge' }]
          }
        }
      } as any)
      vi.mocked(syncManualPlannedWorkoutStructureToIntervalsIfSynced).mockResolvedValue({
        synced: false,
        sync_status: 'LOCAL_ONLY'
      })

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
        title: 'Repeat patch',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 2400,
        structuredWorkout: {
          steps: [{ type: 'Active', name: 'Main', steps: [{ type: 'Active', name: 'Work' }] }]
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)

      vi.mocked(writeCanonicalPlannedWorkoutStructure).mockResolvedValue({
        workout: {
          id: 'pw-5',
          structuredWorkout: {
            steps: [
              { type: 'Active', name: 'Main', steps: [{ type: 'Active', name: 'Work' }], reps: 4 }
            ]
          }
        }
      } as any)

      await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-5',
          operations: [{ op: 'add', path: 'steps.0.repeat', value: 4 }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(writeCanonicalPlannedWorkoutStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          structure: expect.objectContaining({
            steps: [
              expect.objectContaining({
                reps: 4
              })
            ]
          })
        })
      )
    })

    it('rejects the patch when a structure generation run is active for the workout', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-inflight',
        title: 'Patch test',
        syncStatus: 'SYNCED',
        type: 'Ride',
        durationSec: 3600,
        structuredWorkout: {
          steps: [{ type: 'Warmup', name: 'Easy start' }],
          coachInstructions: 'Old'
        },
        user: { ftp: 250, lthr: 168, maxHr: 185 }
      } as any)
      vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(true)

      const result = await tools.patch_planned_workout_structure.execute(
        {
          workout_id: 'pw-inflight',
          operations: [{ op: 'replace', path: 'steps.0.name', value: 'Revised warmup' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(hasActiveStructureGenerationRun).toHaveBeenCalledWith('pw-inflight')
      expect(result).toEqual({
        success: false,
        structure_job_in_flight: true,
        error:
          'Structure generation or adjustment is already running for this workout. Wait for it to finish before editing structure directly.'
      })
      expect(writeCanonicalPlannedWorkoutStructure).not.toHaveBeenCalled()
      expect(plannedWorkoutRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('get_planned_workout_details', () => {
    it('returns operational context for conflict and staleness awareness', async () => {
      vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
        id: 'pw-details',
        title: 'Threshold',
        date: new Date('2026-02-20T00:00:00Z'),
        type: 'Ride',
        durationSec: 3600,
        syncStatus: 'SYNCED',
        completionStatus: 'PENDING',
        structuredWorkout: { source: 'AI_GENERATION', diagnostics: [] },
        syncConflict: true,
        pendingRemoteStructuredWorkout: { steps: [] },
        user: { ftp: 260 },
        trainingWeek: null
      } as any)
      vi.mocked(buildPlannedWorkoutOperationalContext).mockResolvedValue({
        sync_conflict: true,
        has_pending_remote_structure: true,
        structure_generation_in_flight: false,
        settings_staleness: {
          stale: true,
          reasons: ['ftp_changed'],
          snapshotProfileId: 'a',
          liveProfileId: 'b'
        },
        has_unresolved_targets: false,
        structure_source: 'AI_GENERATION',
        unresolved_diagnostics_count: 0
      })

      const result = await tools.get_planned_workout_details.execute(
        { workout_id: 'pw-details' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          sync_conflict: true,
          has_pending_remote_structure: true,
          structure_generation_in_flight: false,
          settings_staleness: expect.objectContaining({ stale: true }),
          structure_source: 'AI_GENERATION'
        })
      )
    })
  })

  describe('publish_planned_workout', () => {
    it('delegates to the shared intervals publish service', async () => {
      vi.mocked(publishPlannedWorkoutToIntervals).mockResolvedValue({
        success: true,
        action: 'updated',
        message: 'Workout updated on Intervals.icu.',
        workout: { id: 'pw-pub', syncStatus: 'SYNCED' }
      })

      const result = await tools.publish_planned_workout.execute(
        { workout_id: 'pw-pub' },
        { toolCallId: '1', messages: [] }
      )

      expect(publishPlannedWorkoutToIntervals).toHaveBeenCalledWith(userId, 'pw-pub')
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          action: 'updated',
          sync_status: 'SYNCED'
        })
      )
    })

    it('returns structured failure details from the publish service', async () => {
      vi.mocked(publishPlannedWorkoutToIntervals).mockResolvedValue({
        success: false,
        code: 'sync_conflict',
        error: 'This workout has a sync conflict. Resolve the conflict before publishing.'
      })

      const result = await tools.publish_planned_workout.execute(
        { workout_id: 'pw-conflict' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          code: 'sync_conflict'
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
      expect(metabolicService.calculateFuelingPlanForDate).toHaveBeenCalledWith(
        userId,
        workoutDate,
        {
          persist: true
        }
      )
      expect(result).toEqual({
        success: true,
        message: 'Planned workout deleted.'
      })
    })
  })

  describe('modify_training_plan_structure', () => {
    it('executes without throwing and calls planService.replanStructure with the reordered blocks', async () => {
      vi.mocked(trainingPlanRepository.getById).mockResolvedValue({
        id: 'plan-1',
        blocks: [
          {
            id: 'block-1',
            name: 'Base',
            type: 'BASE',
            primaryFocus: 'AEROBIC',
            durationWeeks: 4,
            order: 1
          },
          {
            id: 'block-2',
            name: 'Build',
            type: 'BUILD',
            primaryFocus: 'THRESHOLD',
            durationWeeks: 3,
            order: 2
          }
        ]
      } as any)
      vi.mocked(planService.replanStructure).mockResolvedValue({ success: true } as any)

      const result = await tools.modify_training_plan_structure.execute(
        {
          plan_id: 'plan-1',
          operations: [
            { type: 'UPDATE', block_id: 'block-1', duration_weeks: 5 },
            { type: 'DELETE', block_id: 'block-2' },
            { type: 'ADD', name: 'Peak', block_type: 'PEAK', duration_weeks: 2 }
          ]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(trainingPlanRepository.getById).toHaveBeenCalledWith('plan-1', userId, {
        include: { blocks: { orderBy: { order: 'asc' } } }
      })
      expect(planService.replanStructure).toHaveBeenCalledTimes(1)
      const [calledUserId, calledPlanId, calledBlocks] = vi.mocked(planService.replanStructure).mock
        .calls[0]!
      expect(calledUserId).toBe(userId)
      expect(calledPlanId).toBe('plan-1')
      expect(calledBlocks).toEqual([
        expect.objectContaining({ id: 'block-1', durationWeeks: 5, order: 1 }),
        expect.objectContaining({ name: 'Peak', type: 'PEAK', durationWeeks: 2, order: 2 })
      ])
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Plan structure modified successfully.',
          proposed_structure: 'Base (5w) -> Peak (2w)'
        })
      )
    })

    it('returns an error when the plan is not found', async () => {
      vi.mocked(trainingPlanRepository.getById).mockResolvedValue(null as any)

      const result = await tools.modify_training_plan_structure.execute(
        { plan_id: 'missing-plan', operations: [] },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ success: false, error: 'Plan not found' })
      expect(planService.replanStructure).not.toHaveBeenCalled()
    })

    it('returns a structured failure when planService.replanStructure rejects', async () => {
      vi.mocked(trainingPlanRepository.getById).mockResolvedValue({
        id: 'plan-2',
        blocks: []
      } as any)
      vi.mocked(planService.replanStructure).mockRejectedValue(new Error('Plan not found'))

      const result = await tools.modify_training_plan_structure.execute(
        {
          plan_id: 'plan-2',
          operations: [{ type: 'ADD', name: 'Base', block_type: 'BASE', duration_weeks: 4 }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ success: false, error: 'Plan not found' })
    })
  })
})
