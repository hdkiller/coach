import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis, buildWorkoutSummary } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import { calculateAge, getUserTimezone } from '../server/utils/date'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { WorkoutConverter } from '../server/utils/workout-converter'
import { syncPlannedWorkoutToIntervals } from '../server/utils/intervals-sync'

const workoutStructureSchema = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'Overall workout strategy description' },
    coachInstructions: {
      type: 'string',
      description: 'Personalized coaching advice based on athlete profile'
    },
    steps: {
      type: 'array',
      description: 'Linear sequence of workout steps (Ride, Run, Swim)',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['Warmup', 'Active', 'Rest', 'Cooldown'] },
          durationSeconds: { type: 'integer' },
          distance: { type: 'integer', description: 'Distance in meters (Swim/Run)' },
          description: { type: 'string', description: 'Pace or stroke description' },
          power: {
            type: 'object',
            properties: {
              value: { type: 'number', description: 'Target % of FTP (e.g. 0.95)' },
              range: {
                type: 'object',
                properties: { start: { type: 'number' }, end: { type: 'number' } },
                required: ['start', 'end'],
                description: 'For ramps: start and end % of FTP'
              }
            }
          },
          heartRate: {
            type: 'object',
            properties: {
              value: { type: 'number', description: 'Target % of LTHR (e.g. 0.85)' },
              range: {
                type: 'object',
                properties: { start: { type: 'number' }, end: { type: 'number' } },
                required: ['start', 'end'],
                description: 'For ramps: start and end % of LTHR'
              }
            }
          },
          cadence: {
            type: 'integer',
            description: 'Target cadence (RPM for Cycling, SPM for Running - single integer)'
          },
          name: { type: 'string', description: "e.g. '5min @ 95%'" },
          stroke: {
            type: 'string',
            description: 'For swimming: Free, Back, Breast, Fly, IM, Choice, Kick, Pull'
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'For swimming: Fins, Paddles, Snorkel, Pull Buoy'
          }
        },
        required: ['type', 'name']
      }
    }
  },
  required: ['steps', 'coachInstructions']
}

export const adjustStructuredWorkoutTask = task({
  id: 'adjust-structured-workout',
  queue: userReportsQueue,
  run: async (payload: { plannedWorkoutId: string; adjustments: any }) => {
    const { plannedWorkoutId, adjustments } = payload

    const workout = await prisma.plannedWorkout.findUnique({
      where: { id: plannedWorkoutId },
      include: {
        user: {
          select: {
            id: true,
            ftp: true,
            lthr: true,
            aiPersona: true,
            name: true,
            dob: true,
            sex: true,
            maxHr: true
          }
        },
        trainingWeek: {
          include: {
            block: {
              include: {
                plan: {
                  include: {
                    goal: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!workout) throw new Error('Workout not found')

    // Fetch Sport Specific Settings
    const sportSettings = await sportSettingsRepository.getForActivityType(
      workout.userId,
      workout.type || ''
    )

    // Update workout metadata if provided
    if (adjustments.durationMinutes || adjustments.intensity) {
      await prisma.plannedWorkout.update({
        where: { id: plannedWorkoutId },
        data: {
          durationSec: adjustments.durationMinutes ? adjustments.durationMinutes * 60 : undefined,
          workIntensity: adjustments.intensity
            ? getIntensityScore(adjustments.intensity)
            : undefined
        }
      })
      // Refresh local var
      workout.durationSec = adjustments.durationMinutes
        ? adjustments.durationMinutes * 60
        : workout.durationSec
      workout.workIntensity = adjustments.intensity
        ? getIntensityScore(adjustments.intensity)
        : workout.workIntensity
    }

    const userAge = calculateAge(workout.user.dob)
    const timezone = await getUserTimezone(workout.userId)

    // Fetch recent workouts for context
    const recentWorkouts = await workoutRepository.getForUser(workout.userId, {
      limit: 5,
      orderBy: { date: 'desc' },
      include: {
        streams: {
          select: {
            hrZoneTimes: true,
            powerZoneTimes: true
          }
        }
      }
    })

    // Resolve Metrics
    const ftp = sportSettings?.ftp || workout.user.ftp || 250
    const lthr = sportSettings?.lthr || workout.user.lthr || 160
    const maxHr = sportSettings?.maxHr || workout.user.maxHr || 190

    // Build zone definitions
    let zoneDefinitions = ''
    if (sportSettings?.hrZones && Array.isArray(sportSettings.hrZones)) {
      zoneDefinitions += `**${workout.type} Heart Rate Zones:**\n`
      sportSettings.hrZones.forEach((z: any) => {
        zoneDefinitions += `- ${z.name}: ${z.min}-${z.max} bpm\n`
      })
    }
    if (sportSettings?.powerZones && Array.isArray(sportSettings.powerZones)) {
      zoneDefinitions += `\n**${workout.type} Power Zones:**\n`
      sportSettings.powerZones.forEach((z: any) => {
        zoneDefinitions += `- ${z.name}: ${z.min}-${z.max} Watts\n`
      })
    }

    const prompt = `Adjust this structured ${workout.type} workout based on user feedback.
    
    ORIGINAL WORKOUT:
    - Title: ${workout.title}
    - Duration: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    - Intensity: ${adjustments.intensity || 'Same as before'}
    - Description: ${workout.description || 'No specific description'}
    
    USER FEEDBACK / ADJUSTMENTS:
    "${adjustments.feedback || 'Please regenerate with the new duration/intensity parameters.'}"
    
    USER PROFILE:
    - Age: ${userAge || 'Unknown'}
    - Sex: ${workout.user.sex || 'Unknown'}
    - FTP: ${ftp}W
    - LTHR: ${lthr} bpm
    
    USER ZONES:
    ${zoneDefinitions}

    RECENT WORKOUTS:
    ${buildWorkoutSummary(recentWorkouts, timezone)}
    
    INSTRUCTIONS:
    - Create a NEW JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration (${Math.round((workout.durationSec || 3600) / 60)}m).
    - Respect the user's feedback.
    - Add updated "coachInstructions".

    FOR CYCLING (Ride/VirtualRide):
    - Use % of FTP for power targets (e.g. 0.95 = 95%).
    - Include target cadence (RPM).

    FOR RUNNING (Run):
    - ALWAYS include 'distance' (meters) for each step (estimate if needed).
    - CRITICAL: Use 'heartRate' object with 'value' (target % of LTHR, e.g. 0.85) for intensity.
    - If user specifies "Zone 2", refer to their HR Zones provided above.
    
    OUTPUT JSON format matching the schema.`

    const structure = await generateStructuredAnalysis(prompt, workoutStructureSchema, 'flash', {
      userId: workout.userId,
      operation: 'adjust_structured_workout',
      entityType: 'PlannedWorkout',
      entityId: plannedWorkoutId
    })

    // Calculate total metrics from steps
    let totalDistance = 0
    let totalDuration = 0
    let totalTSS = 0

    if (structure.steps && Array.isArray(structure.steps)) {
      structure.steps.forEach((step: any) => {
        totalDistance += step.distance || 0
        const duration = step.durationSeconds || 0
        totalDuration += duration

        let intensity = 0.5
        if (step.power) {
          intensity =
            typeof step.power.value === 'number'
              ? step.power.value
              : step.power.range
                ? (step.power.range.start + step.power.range.end) / 2
                : 0.5
        } else if (step.heartRate) {
          intensity =
            typeof step.heartRate.value === 'number'
              ? step.heartRate.value
              : step.heartRate.range
                ? (step.heartRate.range.start + step.heartRate.range.end) / 2
                : 0.5
        }

        if (duration > 0) {
          totalTSS += ((duration * intensity * intensity) / 3600) * 100
        }
      })
    }

    const updateData: any = {
      structuredWorkout: structure as any
    }

    if (totalDistance > 0) updateData.distanceMeters = totalDistance
    if (totalDuration > 0) updateData.durationSec = totalDuration
    if (totalTSS > 0) updateData.tss = Math.round(totalTSS)
    if (totalTSS > 0 && totalDuration > 0) {
      updateData.workIntensity = parseFloat(Math.sqrt((36 * totalTSS) / totalDuration).toFixed(2))
    }

    const updatedWorkout = await prisma.plannedWorkout.update({
      where: { id: plannedWorkoutId },
      data: updateData
    })

    // Sync to Intervals.icu
    const isLocal =
      updatedWorkout.syncStatus === 'LOCAL_ONLY' ||
      updatedWorkout.externalId.startsWith('ai_gen_') ||
      updatedWorkout.externalId.startsWith('ai-gen-') ||
      updatedWorkout.externalId.startsWith('adhoc-')

    if (!isLocal) {
      const workoutData = {
        title: updatedWorkout.title,
        description: updatedWorkout.description || '',
        steps: (structure as any).steps || [],
        messages: [],
        ftp: ftp
      }
      const workoutDoc = WorkoutConverter.toIntervalsICU(workoutData)
      await syncPlannedWorkoutToIntervals(
        'UPDATE',
        {
          ...updatedWorkout,
          workout_doc: workoutDoc
        },
        workout.userId
      )
    }

    return { success: true, plannedWorkoutId }
  }
})

function getIntensityScore(intensity: string): number {
  switch (intensity) {
    case 'recovery':
      return 0.3
    case 'easy':
      return 0.5
    case 'moderate':
      return 0.7
    case 'hard':
      return 0.85
    case 'very_hard':
      return 0.95
    default:
      return 0.5
  }
}
