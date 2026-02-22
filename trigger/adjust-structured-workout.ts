import './init'
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
    description: {
      type: 'string',
      description:
        'Overall workout strategy in complete sentences. NEVER use bullet points or list the steps here.'
    },
    coachInstructions: {
      type: 'string',
      description: 'Personalized advice on technique, execution, and purpose (2-3 sentences).'
    },
    sRPE_target: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Optional session RPE target on a 1-10 scale.'
    },
    steps: {
      type: 'array',
      description: 'Linear sequence of workout steps (Ride, Run, Swim)',
      items: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            description: 'Nested steps for repeats/loops',
            items: { $ref: '#' }
          },
          reps: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Number of times to repeat these steps (for loops)'
          },
          type: { type: 'string', enum: ['Warmup', 'Active', 'Rest', 'Cooldown'] },
          durationSeconds: { type: 'integer', minimum: 1 },
          distance: { type: 'integer', minimum: 1, description: 'Distance in meters (Swim/Run)' },
          description: { type: 'string', description: 'Pace or stroke description' },
          primaryTarget: {
            type: 'string',
            enum: ['power', 'heartRate', 'pace', 'rpe'],
            description:
              'Primary target cue for this step. Use exactly one primary target to avoid conflicting instructions.'
          },
          power: {
            type: 'object',
            properties: {
              value: { type: 'number', minimum: 0, description: 'Target % of FTP (e.g. 0.95)' },
              units: {
                type: 'string',
                description: 'Target unit. Prefer "%" by default; can also be "w" or zone labels.'
              },
              range: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0 },
                  end: { type: 'number', minimum: 0 }
                },
                required: ['start', 'end'],
                description: 'For ramps: start and end % of FTP'
              }
            }
          },
          heartRate: {
            type: 'object',
            properties: {
              value: {
                type: 'number',
                minimum: 0,
                description: 'Target % of LTHR (e.g. 0.85) or absolute bpm if units=bpm.'
              },
              units: {
                type: 'string',
                description: 'Target unit. Use "LTHR" by default; can also be "HR" or "bpm".'
              },
              range: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0 },
                  end: { type: 'number', minimum: 0 }
                },
                required: ['start', 'end'],
                description: 'For ramps: start and end % of LTHR'
              }
            }
          },
          pace: {
            type: 'object',
            description: 'Target % of threshold pace (e.g. 0.95 = 95%)',
            properties: {
              value: { type: 'number', minimum: 0 },
              units: {
                type: 'string',
                description:
                  'Pace target unit. Use "Pace" for percentages, or an absolute unit like "/km".'
              },
              range: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0 },
                  end: { type: 'number', minimum: 0 }
                }
              }
            }
          },
          rpe: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Step RPE target on a 1-10 scale.'
          },
          cadence: {
            type: 'integer',
            description: 'Target cadence (RPM for Cycling, SPM for Running - single integer)'
          },
          cadenceRange: {
            type: 'object',
            properties: {
              start: { type: 'integer', minimum: 1 },
              end: { type: 'integer', minimum: 1 }
            },
            required: ['start', 'end'],
            description: 'Target cadence range for this step (e.g. 85-95 RPM).'
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
          },
          sendoffSeconds: {
            type: 'integer',
            minimum: 1,
            description: 'Swim send-off time in seconds (e.g. leave every 90s).'
          },
          targetSplit: {
            type: 'string',
            description: 'Swim target split (e.g. "1:40/100m").'
          },
          cssPercent: {
            type: 'number',
            minimum: 0,
            description: 'Swim pace relative to CSS (e.g. 1.03 = 103% CSS).'
          },
          restSeconds: {
            type: 'integer',
            minimum: 0,
            description: 'Explicit rest between swim/run reps or sets in seconds.'
          },
          surface: {
            type: 'string',
            enum: ['road', 'track', 'trail', 'treadmill', 'mixed'],
            description: 'Running surface context.'
          },
          terrain: {
            type: 'string',
            enum: ['flat', 'rolling', 'hilly', 'mixed'],
            description: 'Running terrain context.'
          },
          gradePercent: {
            type: 'number',
            description: 'Running grade/incline in percent when relevant.'
          },
          environment: {
            type: 'string',
            enum: ['indoor', 'outdoor'],
            description: 'Environment context for execution constraints.'
          }
        },
        required: ['type', 'name']
      }
    },
    exercises: {
      type: 'array',
      description: 'List of exercises for Strength training',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer', minimum: 1, maximum: 20 },
          reps: { type: 'string', description: "e.g. '8-12' or 'AMRAP'" },
          weight: { type: 'string', description: "e.g. '70% 1RM' or 'Bodyweight'" },
          duration: {
            type: 'integer',
            minimum: 1,
            description: 'Duration in seconds if time-based'
          },
          rest: { type: 'string', description: "Rest between sets e.g. '90s'" },
          notes: { type: 'string', description: 'Form cues or tempo' },
          intent: {
            type: 'string',
            enum: ['max_strength', 'power', 'muscular_endurance', 'prehab'],
            description: 'Primary intent for endurance-specific strength work.'
          },
          movementPattern: {
            type: 'string',
            enum: ['squat', 'hinge', 'push', 'pull', 'lunge', 'core', 'carry', 'mobility'],
            description: 'Primary movement pattern for exercise classification.'
          },
          rpe: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Exercise effort target on a 1-10 scale.'
          }
        },
        required: ['name']
      }
    }
  },
  required: ['coachInstructions']
}

function parseSingleZoneFromName(stepName: unknown): number | null {
  if (typeof stepName !== 'string' || stepName.trim().length === 0) return null
  const matches = [...stepName.matchAll(/\bZ([1-7])\b/gi)]
  const uniqueZones = [...new Set(matches.map((m) => Number(m[1])))]
  return uniqueZones.length === 1 ? uniqueZones[0]! : null
}

function getFallbackZoneBounds(zone: number): { start: number; end: number } | null {
  const map: Record<number, { start: number; end: number }> = {
    1: { start: 0.5, end: 0.6 },
    2: { start: 0.6, end: 0.75 },
    3: { start: 0.75, end: 0.9 },
    4: { start: 0.9, end: 1.05 },
    5: { start: 1.05, end: 1.2 },
    6: { start: 1.2, end: 1.4 },
    7: { start: 1.4, end: 1.6 }
  }
  return map[zone] || null
}

function getZoneBoundsFromSettings(
  zone: number,
  sportSettings: any,
  ftp: number
): { start: number; end: number } | null {
  if (!sportSettings?.powerZones || !Array.isArray(sportSettings.powerZones) || ftp <= 0) {
    return null
  }
  const zoneDef = sportSettings.powerZones[zone - 1]
  if (!zoneDef) return null
  const min = Number(zoneDef.min)
  const max = Number(zoneDef.max)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return null
  const start = Math.max(0, min / ftp)
  const end = Math.max(start, max / ftp)
  return { start, end }
}

function applyZoneHintToCyclingPower(step: any, sportSettings: any, ftp: number) {
  const zone = parseSingleZoneFromName(step?.name)
  if (!zone) return

  const bounds = getZoneBoundsFromSettings(zone, sportSettings, ftp) || getFallbackZoneBounds(zone)
  if (!bounds) return

  const midpoint = Number(((bounds.start + bounds.end) / 2).toFixed(3))
  if (step?.power?.range) {
    step.power.range = {
      start: Number(bounds.start.toFixed(3)),
      end: Number(bounds.end.toFixed(3))
    }
    step.power.units = '%'
    return
  }

  if (!step.power) step.power = {}
  step.power.value = midpoint
  step.power.units = '%'
}

export const adjustStructuredWorkoutTask = task({
  id: 'adjust-structured-workout',
  queue: userReportsQueue,
  maxDuration: 90,
  run: async (payload: { plannedWorkoutId: string; adjustments: any }) => {
    const { plannedWorkoutId, adjustments } = payload
    const startedAtMs = Date.now()
    const MAX_DURATION_MS = 90_000
    const logStage = (stage: string, meta: Record<string, any> = {}) => {
      const elapsedMs = Date.now() - startedAtMs
      logger.log(`[AdjustStructuredWorkout] ${stage}`, {
        plannedWorkoutId,
        elapsedMs,
        remainingMs: Math.max(0, MAX_DURATION_MS - elapsedMs),
        ...meta
      })
    }

    logStage('start', {
      hasFeedback: Boolean(adjustments?.feedback),
      durationMinutes: adjustments?.durationMinutes || null,
      intensity: adjustments?.intensity || null
    })

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
    logStage('loaded-workout', {
      userId: workout.userId,
      type: workout.type,
      hasExistingStructure: Boolean(workout.structuredWorkout),
      durationSec: workout.durationSec
    })

    // Fetch Sport Specific Settings
    const sportSettings = await sportSettingsRepository.getForActivityType(
      workout.userId,
      workout.type || ''
    )
    logStage('loaded-sport-settings', {
      hasSettings: Boolean(sportSettings),
      hasHrZones: Boolean((sportSettings?.hrZones as any)?.length),
      hasPowerZones: Boolean((sportSettings?.powerZones as any)?.length),
      loadPreference: sportSettings?.loadPreference || null
    })

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
    logStage('applied-adjustments', {
      durationSec: workout.durationSec,
      intensity: workout.workIntensity
    })

    const userAge = calculateAge(workout.user.dob)
    const timezone = await getUserTimezone(workout.userId)
    logStage('resolved-timezone', { timezone, userAge: userAge || null })

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
    logStage('loaded-recent-workouts', { count: recentWorkouts.length })

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

    if (sportSettings?.loadPreference) {
      zoneDefinitions += `\n**Preferred Load Metric:** ${sportSettings.loadPreference}\n`
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
    
    JSON HYGIENE RULES:
    - OMIT properties with null/empty values.
    - NEVER output placeholder values such as "N/A", "none", "-", or empty strings.
    - Include only sport-relevant keys for this workout type.
    - Ensure valid JSON with no duplicate keys.

    INSTRUCTIONS:
    - Create a NEW JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration (${Math.round((workout.durationSec || 3600) / 60)}m).
    - Respect the user's feedback.
    - Preserve the workout's core objective unless the user explicitly requests changing it.
    - Ensure each block has a clear physiological purpose and a logical sequence of stress and recovery.
    - Do NOT create adjacent steps with identical duration + intensity + cadence unless they are explicitly nested in a repeat block.
    - If a step name implies a focus change, at least one target (power/HR/pace/cadence/RPE) MUST differ from the prior step.
    - **description**: Use ONLY complete sentences to describe the overall purpose and strategy. **NEVER use bullet points or list the steps here**.
    - **coachInstructions**: Provide an updated personalized message (2-3 sentences) explaining what changed, why it changed, and how to execute the key set.
    - For aerobic/endurance sessions, keep main-set blocks distinct (settle/sustain/technique) rather than generic duplicates.

    FOR CYCLING (Ride/VirtualRide):
    - Use % of FTP for power targets (e.g. 0.95 = 95%).
    - Set \`power.units\` to "%" unless the user explicitly requested watts.
    - Include target cadence (RPM).
    - For cadence-focus steps, cadence MUST differ from surrounding steady steps.
    - If HR zones are available, include at least one HR guardrail in coachInstructions.
    - Keep hard interval work recoverable and repeatable.

    FOR RUNNING (Run):
    - ALWAYS include 'distance' (meters) for each step (estimate if needed).
    - CRITICAL: Use 'heartRate' object with 'value' (target % of LTHR, e.g. 0.85) for intensity.
    - Set \`heartRate.units\` to "LTHR" by default.
    - HIGHLY RECOMMENDED: Include a 'pace' object with 'value' (target % of threshold pace) for active steps.
    - If pace is percentage-based, set \`pace.units\` to "Pace".
    - If user specifies "Zone 2", refer to their HR Zones provided above.
    - Do not stack maximal efforts without sufficient recovery.

    FOR SWIMMING (Swim):
    - ALWAYS include 'distance' (meters) for each step (estimate if needed).
    - Use 'stroke' to specify: Free, Back, Breast, Fly, IM, Choice, Kick, Pull.
    - Use 'equipment' array for gear: Fins, Paddles, Snorkel, Pull Buoy.
    - CRITICAL: You MUST include a 'heartRate' object with 'value' (target % of LTHR, e.g. 0.85) for EVERY step.
    - Set \`heartRate.units\` to "LTHR" unless using explicit bpm.
    - RECOMMENDED: Include a 'pace' object with 'value' (target % of threshold pace) for main set intervals.
    
    FOR STRENGTH (Gym/WeightTraining):
    - Instead of 'steps', provide a list of 'exercises'.
    - Each exercise should include practical loading guidance and rest.

    FINAL SELF-CHECK BEFORE OUTPUT:
    - Total duration equals target duration.
    - No redundant adjacent steps.
    - Every step has a clear purpose and valid target.
    - Output contains no placeholder or irrelevant sport fields.
    
    OUTPUT JSON format matching the schema.`
    logStage('prompt-built', {
      promptChars: prompt.length,
      targetDurationMinutes: Math.round((workout.durationSec || 3600) / 60)
    })

    const structure = (await generateStructuredAnalysis(prompt, workoutStructureSchema, 'flash', {
      userId: workout.userId,
      operation: 'adjust_structured_workout',
      entityType: 'PlannedWorkout',
      entityId: plannedWorkoutId
    })) as any
    logStage('ai-structure-generated', {
      hasSteps: Array.isArray(structure?.steps),
      stepsCount: Array.isArray(structure?.steps) ? structure.steps.length : 0,
      exercisesCount: Array.isArray(structure?.exercises) ? structure.exercises.length : 0
    })

    const normalizeAndCalculate = (steps: any[], depth = 0, parentStep: any = null) => {
      let distance = 0
      let duration = 0
      let tss = 0

      if (!Array.isArray(steps)) return { distance, duration, tss }

      steps.forEach((step: any) => {
        const recoverTarget = (fieldName: string) => {
          if (typeof step[fieldName] === 'string') {
            step[fieldName] = undefined
          }

          const hasOwnTarget = step.range || step.value
          if (
            !step[fieldName] ||
            (typeof step[fieldName] === 'object' && Object.keys(step[fieldName]).length === 0)
          ) {
            if (step.range) {
              step[fieldName] = { range: step.range }
              delete step.range
            } else if (step.value) {
              step[fieldName] = { value: step.value }
              delete step.value
            } else if (!hasOwnTarget && parentStep?.[fieldName]) {
              step[fieldName] = JSON.parse(JSON.stringify(parentStep[fieldName]))
            }
          }
        }

        if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
          recoverTarget('power')

          if (!step.power || (step.power.value === undefined && !step.power.range)) {
            if (step.type === 'Warmup') step.power = { value: 0.5, units: '%' }
            else if (step.type === 'Rest') step.power = { value: 0.45, units: '%' }
            else if (step.type === 'Cooldown') step.power = { value: 0.4, units: '%' }
            else step.power = { value: 0.75, units: '%' }
          } else if (!step.power.units) {
            step.power.units = '%'
          }
          applyZoneHintToCyclingPower(step, sportSettings, ftp)

          if (!step.cadence) {
            if (step.type === 'Warmup' || step.type === 'Cooldown') step.cadence = 85
            else if (step.type === 'Rest') step.cadence = 80
            else if (parentStep?.cadence) step.cadence = parentStep.cadence
            else step.cadence = 90
          }

          step.stroke = undefined
          step.equipment = undefined
        } else if (workout.type === 'Run') {
          recoverTarget('heartRate')
          recoverTarget('pace')
          recoverTarget('power')

          const hasHr = step.heartRate && (step.heartRate.value || step.heartRate.range)
          const hasPace = step.pace && (step.pace.value || step.pace.range)
          const hasPower = step.power && (step.power.value || step.power.range)

          if (!hasHr && !hasPace && !hasPower) {
            if (step.type === 'Warmup') step.heartRate = { value: 0.6, units: 'LTHR' }
            else if (step.type === 'Rest') step.heartRate = { value: 0.5, units: 'LTHR' }
            else if (step.type === 'Cooldown') step.heartRate = { value: 0.55, units: 'LTHR' }
            else step.heartRate = { value: 0.75, units: 'LTHR' }
          } else if (step.heartRate && !step.heartRate.units) {
            step.heartRate.units = 'LTHR'
          }

          if (step.pace && !step.pace.units) {
            step.pace.units = 'Pace'
          }

          if (step.distance) step.distance = Number(step.distance)
        }

        if (step.durationSeconds === undefined && step.duration !== undefined) {
          step.durationSeconds = step.duration
        }

        let stepDistance = 0
        let stepDuration = 0
        let stepTSS = 0

        if (step.steps && Array.isArray(step.steps) && step.steps.length > 0) {
          const nested = normalizeAndCalculate(step.steps, depth + 1, step)
          stepDistance = nested.distance
          stepDuration = nested.duration
          stepTSS = nested.tss
        } else {
          stepDistance = step.distance || 0
          stepDuration = step.durationSeconds || 0

          if (stepDuration === 0 && !structure.exercises) {
            if (step.distance && step.distance > 0) {
              stepDuration = Math.round(step.distance * 3)
              step.durationSeconds = stepDuration
            } else if (step.type !== 'Rest') {
              stepDuration = 60
              step.durationSeconds = stepDuration
            }
          }

          let intensity = 0.5
          if (step.heartRate) {
            if (typeof step.heartRate.value === 'number') {
              intensity = step.heartRate.value
            } else if (step.heartRate.range) {
              intensity = (step.heartRate.range.start + step.heartRate.range.end) / 2
            }
          } else if (step.power) {
            if (typeof step.power.value === 'number') {
              intensity = step.power.value
            } else if (step.power.range) {
              intensity = (step.power.range.start + step.power.range.end) / 2
            }
          } else {
            switch (step.type) {
              case 'Warmup':
                intensity = 0.5
                break
              case 'Cooldown':
                intensity = 0.4
                break
              case 'Rest':
                intensity = 0.4
                break
              case 'Active':
                intensity = 0.75
                break
            }
          }

          if (stepDuration > 0) {
            stepTSS = ((stepDuration * intensity * intensity) / 3600) * 100
          }
        }

        const reps = step.reps || 1
        distance += stepDistance * reps
        duration += stepDuration * reps
        tss += stepTSS * reps
      })

      return { distance, duration, tss }
    }

    const totals = normalizeAndCalculate(structure.steps || [])
    const totalDistance = totals.distance
    const totalDuration = totals.duration
    const totalTSS = totals.tss
    logStage('structure-normalized', {
      totalDistance,
      totalDuration,
      totalTSS: Math.round(totalTSS * 100) / 100
    })

    const hasSteps = Array.isArray(structure.steps) && structure.steps.length > 0
    const hasExercises = Array.isArray(structure.exercises) && structure.exercises.length > 0
    if ((hasSteps || hasExercises) && totalDuration <= 0) {
      throw new Error('Adjusted structured workout has zero total duration')
    }
    if ((hasSteps || hasExercises) && totalTSS <= 0) {
      throw new Error('Adjusted structured workout has zero total TSS')
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
    logStage('workout-updated', {
      updatedDurationSec: updatedWorkout.durationSec,
      updatedTss: updatedWorkout.tss,
      updatedIntensity: updatedWorkout.workIntensity
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
        type: updatedWorkout.type || '',
        steps: (structure as any).steps || [],
        exercises: (structure as any).exercises || [],
        messages: [],
        ftp: ftp,
        sportSettings: sportSettings || undefined
      }
      const workoutDoc = WorkoutConverter.toIntervalsICU(workoutData)
      await syncPlannedWorkoutToIntervals(
        'UPDATE',
        {
          id: updatedWorkout.id,
          externalId: updatedWorkout.externalId,
          date: updatedWorkout.date,
          startTime: updatedWorkout.startTime,
          title: updatedWorkout.title,
          description: updatedWorkout.description,
          type: updatedWorkout.type,
          durationSec: updatedWorkout.durationSec,
          tss: updatedWorkout.tss,
          managedBy: updatedWorkout.managedBy,
          workout_doc: workoutDoc
        },
        workout.userId
      )
      logStage('intervals-sync-finished')
    }

    logStage('completed')
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
