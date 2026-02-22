import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis, buildWorkoutSummary } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import { syncPlannedWorkoutToIntervals } from '../server/utils/intervals-sync'
import { WorkoutConverter } from '../server/utils/workout-converter'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import { checkQuota } from '../server/utils/quotas/engine'

const workoutStructureSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description:
        'Overall workout strategy in complete sentences (e.g. "Warm up gradually, then perform 3x8 minutes at threshold with 2 minutes recovery."). NEVER use bullet points or list the steps here.'
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
            description: 'Nested steps for repeats/loops. Use sparingly.',
            items: {
              type: 'object',
              properties: {
                // Reduced set for nested steps to prevent bloat
                type: { type: 'string', enum: ['Warmup', 'Active', 'Rest', 'Cooldown'] },
                durationSeconds: { type: 'integer', minimum: 1 },
                distance: { type: 'integer', minimum: 1 },
                name: { type: 'string' },
                primaryTarget: {
                  type: 'string',
                  enum: ['power', 'heartRate', 'pace', 'rpe'],
                  description:
                    'Primary target cue for this step. Use exactly one primary target to avoid conflicting instructions.'
                },
                power: {
                  type: 'object',
                  properties: {
                    value: { type: 'number', minimum: 0 },
                    units: { type: 'string' }
                  }
                },
                heartRate: {
                  type: 'object',
                  properties: {
                    value: { type: 'number', minimum: 0 },
                    units: { type: 'string' }
                  }
                },
                pace: {
                  type: 'object',
                  properties: {
                    value: { type: 'number', minimum: 0 },
                    units: { type: 'string' }
                  }
                },
                rpe: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  description: 'Step RPE target on a 1-10 scale.'
                }
              },
              required: ['type', 'name', 'durationSeconds']
            }
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
                description: 'For ramps: start and end % of FTP',
                required: ['start', 'end']
              },
              ramp: {
                type: 'boolean',
                description:
                  'Set to TRUE if this step is a progressive ramp (e.g. Warmup 50->75%). Set to FALSE or omit for steady-state ranges (e.g. Zone 2 65-75%).'
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
                description:
                  'Target range as % of LTHR (e.g. start: 0.70, end: 0.80 for Zone 2 blocks or progression)'
              },
              ramp: {
                type: 'boolean',
                description:
                  'Set to TRUE if this step is a progressive ramp. Set to FALSE or omit for steady-state ranges.'
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
            description: 'Target cadence in RPM (single integer, no ranges)'
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

export const generateStructuredWorkoutTask = task({
  id: 'generate-structured-workout',
  queue: userReportsQueue,
  maxDuration: 90,
  run: async (payload: { plannedWorkoutId: string }) => {
    const { plannedWorkoutId } = payload
    const startedAtMs = Date.now()
    const MAX_DURATION_MS = 90_000
    const logStage = (stage: string, meta: Record<string, any> = {}) => {
      const elapsedMs = Date.now() - startedAtMs
      logger.log(`[GenerateStructuredWorkout] ${stage}`, {
        plannedWorkoutId,
        elapsedMs,
        remainingMs: Math.max(0, MAX_DURATION_MS - elapsedMs),
        ...meta
      })
    }

    logStage('start')

    const workout = await (prisma as any).plannedWorkout.findUnique({
      where: { id: plannedWorkoutId },
      include: {
        user: {
          select: {
            ftp: true,
            lthr: true,
            aiPersona: true,
            name: true,
            maxHr: true,
            subscriptionTier: true,
            isAdmin: true
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

    if (!workout) {
      logger.warn('Workout not found, skipping structured generation', { plannedWorkoutId })
      return { success: false, error: 'Workout not found' }
    }
    logStage('loaded-workout', {
      userId: workout.userId,
      type: workout.type,
      hasExistingStructure: Boolean(workout.structuredWorkout),
      durationSec: workout.durationSec
    })

    // Check Quota
    try {
      await checkQuota(workout.userId, 'generate_structured_workout')
    } catch (quotaError: any) {
      if (quotaError.statusCode === 429) {
        logger.warn('Structured workout generation quota exceeded', {
          userId: workout.userId,
          plannedWorkoutId
        })
        return { success: false, reason: 'QUOTA_EXCEEDED' }
      }
      throw quotaError
    }
    logStage('quota-check-passed')

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

    // Build context
    const persona = workout.user.aiPersona || 'Supportive'
    const goal =
      workout.trainingWeek?.block.plan.goal?.title ||
      workout.trainingWeek?.block.plan.name ||
      'General Fitness'
    const phase = workout.trainingWeek?.block.type || 'General'
    const focus = workout.trainingWeek?.block.primaryFocus || 'Fitness'

    // Fetch user timezone
    const timezone = await getUserTimezone(workout.userId)
    logStage('resolved-timezone', { timezone })

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

    // Subscription Limit Check
    // Free users cannot generate structured workouts more than 4 weeks (28 days) in the future
    if (workout.user.subscriptionTier === 'FREE') {
      const today = getUserLocalDate(timezone)
      const fourWeeksFromNow = new Date(today)
      fourWeeksFromNow.setUTCDate(today.getUTCDate() + 28)

      // Compare dates (both are UTC midnight aligned)
      if (workout.date > fourWeeksFromNow) {
        logger.log('Skipping structured workout generation: Free tier limit (4 weeks)', {
          userId: workout.userId,
          workoutDate: workout.date,
          limitDate: fourWeeksFromNow
        })
        return {
          success: true,
          skipped: true,
          message: 'Structured workout generation is limited to 4 weeks in advance for free users.'
        }
      }
    }
    logStage('subscription-check-passed', { subscriptionTier: workout.user.subscriptionTier })

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

    if (lthr) {
      zoneDefinitions += `\n**Reference LTHR:** ${lthr} bpm\n`
    }
    if (ftp) {
      zoneDefinitions += `**Reference FTP:** ${ftp} Watts\n`
    }
    const loadPreference = sportSettings?.loadPreference || 'HR_POWER_PACE'
    if (sportSettings?.loadPreference) {
      zoneDefinitions += `**Preferred Load Metric:** ${loadPreference}\n`
    }

    const warmupTime = sportSettings?.warmupTime || 10
    const cooldownTime = sportSettings?.cooldownTime || 5

    if (sportSettings?.warmupTime) {
      zoneDefinitions += `**Default Warmup Duration:** ${sportSettings.warmupTime} minutes\n`
    }
    if (sportSettings?.cooldownTime) {
      zoneDefinitions += `**Default Cooldown Duration:** ${sportSettings.cooldownTime} minutes\n`
    }

    const prompt = `Design a structured ${workout.type} workout for ${workout.user.name || 'Athlete'}.
    
    TITLE: ${workout.title}
    DURATION: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    INTENSITY: ${workout.workIntensity || 'Moderate'}
    DESCRIPTION: ${workout.description || 'No specific description'}
    USER FTP: ${ftp}W
    USER LTHR: ${lthr} bpm
    TYPE: ${workout.type}
    PREFERRED INTENSITY METRIC: ${loadPreference}
    
    CONTEXT:
    - Goal: ${goal}
    - Phase: ${phase}
    - Focus: ${focus}
    - Coach Persona: ${persona}
    
    RECENT WORKOUTS:
    ${buildWorkoutSummary(recentWorkouts, timezone)}

    CRITICAL: ALWAYS use the user's specific zones defined below for this activity type.

    ${zoneDefinitions}

    When generating "[Zone 2]" workouts, target ONLY the user's defined Z2 range for this specific sport. Never use generic percentages - always reference the provided zones first.
    
    JSON HYGIENE RULES:
    1. OMIT properties with null or empty values. If a metric (e.g. power) is not relevant for a step, do not include the key at all.
    2. NEVER repeat keys within the same object.
    3. MANDATORY: Every step (including nested steps) MUST have a non-zero durationSeconds.
    4. Ensure the structure is VALID JSON.
    5. NEVER output placeholder values such as "N/A", "none", "-", or empty strings.
    6. Include only sport-relevant keys for this workout type. Do not include swim/run-only fields in cycling workouts.

    INSTRUCTIONS:
    - Create a JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration exactly.
    - Every workout must have a clear physiological objective (e.g. aerobic endurance, threshold, VO2, neuromuscular, recovery) and each block should support that objective.
    - Sequence intensity logically (warm-up -> quality work -> recovery -> cooldown). Avoid random intensity jumps.
    - Do NOT create adjacent steps with identical duration + intensity + cadence unless they are explicitly nested in a repeat block.
    - If a step name implies a focus change (e.g. cadence focus), at least one target (power/HR/pace/cadence/RPE) MUST differ from the prior step.
    - Include specific execution cues in 'coachInstructions' (breathing, pacing, cadence control, form focus).
    - **METRIC PRIORITY**: Respect the user's PREFERRED INTENSITY METRIC (${loadPreference}). 
      - Priority Order: ${loadPreference.split('_').join(' > ')}.
      - Use the FIRST available metric from this list for each step as the primary target object. 
      - NEVER duplicate a workout step just to provide a different intensity metric. One step = one time block.
    - **steps**: All rules below (targets, etc.) apply to BOTH top-level steps AND nested steps inside repeats.
    - **description**: Use ONLY complete sentences to describe the overall purpose and strategy. **NEVER use bullet points or list the steps here**.
    - **coachInstructions**: Provide a personalized message (2-3 sentences) explaining WHY this workout matters for their goal (${goal}) and how to execute it (e.g. "Focus on smooth cadence during the efforts"). Use the '${persona}' persona tone.
    - **Warmup/Cooldown**: Use the user's default durations (${warmupTime} minutes for Warmup, ${cooldownTime} minutes for Cooldown) unless the workout TITLE or DESCRIPTION explicitly asks for a different specific duration.
    - For aerobic/endurance workouts, create at least 2 distinct main-set sub-blocks with clear purpose (settle, sustain, technique/cadence or control), not one repeated generic block.
    - For Zone 2 workouts, keep primary targets inside the user's provided endurance/aerobic zones whenever available.

    FOR CYCLING (Ride/VirtualRide):
    - MANDATORY: Use % of FTP for power targets (e.g. 0.95 = 95%) for EVERY step.
    - Set 'power.units' to "%" unless there is an explicit reason to use "w".
    - For ramps (Warmup/Cooldown), use "range" with "start" and "end" values (e.g. start: 0.50, end: 0.75 for warmup).
    - MANDATORY: Include target "cadence" (RPM) for EVERY step (including Warmup/Rest). Use 85-95 for active, 80 for rest.
    - For cadence-focus steps, cadence MUST differ from surrounding steady steps (e.g. steady 85-90, focus 95-100) and power should be adjusted if needed.
    - For aerobic rides, avoid repeated identical 20+ minute blocks unless deliberate repeats are requested.
    - If HR zones are available, include at least one HR guardrail in coachInstructions (e.g. cap near top of aerobic zone).
    - For interval sets, include realistic recovery between hard repetitions and maintain repeatability of quality efforts.

    FOR RUNNING (Run):
    - Steps should have 'type', 'durationSeconds', 'name'.
    - ALWAYS include 'distance' (meters) for each step. If duration-based, ESTIMATE the distance based on the intensity/pace.
    - Use 'power' object if it's a power-based run (e.g. Stryd).
    - Use the user's PREFERRED INTENSITY METRIC (${loadPreference}) as the primary target.
    - If HR is preferred, ensure 'heartRate' is populated. If PACE is preferred, ensure 'pace' is populated.
    - Set 'heartRate.units' to "LTHR" by default for percentage targets.
    - If 'pace' is used as percentage, set 'pace.units' to "Pace".
    - Do NOT mix HR and Pace targets in the same step unless specifically requested in the description.
    - Prefer 'heartRate.range' or 'pace.range' for steady aerobic/endurance/tempo blocks (e.g. Zone 2 -> start: 0.70, end: 0.80). 
    - DO NOT rely solely on description for intensity. Provide an estimated target object for every step.
    - Respect quality spacing: avoid stacking maximal efforts without enough recovery.
    
    FOR SWIMMING (Swim):
    - Steps should ideally have 'distance' (meters) instead of or in addition to duration. If using duration, estimate distance.
    - Use 'stroke' to specify: Free, Back, Breast, Fly, IM, Choice, Kick, Pull.
    - Use 'equipment' array for gear: Fins, Paddles, Snorkel, Pull Buoy.
    - Include 'stroke' type in description if applicable.
    - CRITICAL: You MUST include a 'heartRate' object with 'value' (target % of LTHR, e.g. 0.85) for EVERY step. Even if it's a technical drill, provide an estimated HR intensity.
    - Set 'heartRate.units' to "LTHR" unless using explicit bpm.
    - RECOMMENDED: Include a 'pace' object with 'value' (target % of threshold pace) for main set intervals.

    FOR STRENGTH (Gym/WeightTraining):
    - Instead of 'steps', provide a list of 'exercises'.
    - Each exercise should have 'name', 'sets', 'reps', 'weight' (optional description like "Heavy" or %1RM), 'rest' (e.g. "90s"), and 'notes'.
    - Structure it as Warmup -> Main Lifts -> Accessories -> Cooldown if possible.

    FINAL SELF-CHECK BEFORE OUTPUT:
    - Total duration equals target duration.
    - No redundant adjacent steps.
    - Every step has a clear purpose and a valid primary target.
    - Output contains no placeholder or irrelevant sport fields.
    
    OUTPUT JSON format matching the schema.`
    logStage('prompt-built', {
      promptChars: prompt.length,
      targetDurationMinutes: Math.round((workout.durationSec || 3600) / 60)
    })

    const structure = (await generateStructuredAnalysis(prompt, workoutStructureSchema, 'flash', {
      userId: workout.userId,
      operation: 'generate_structured_workout',
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
        // 1. Recover misplaced targets (AI sometimes puts 'value' or 'range' at top level)
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

        // 2. Sport-Specific Normalization
        if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
          recoverTarget('power')
          if (!step.power || (step.power.value === undefined && !step.power.range)) {
            if (step.type === 'Warmup') step.power = { value: 0.5 }
            else if (step.type === 'Rest') step.power = { value: 0.45 }
            else if (step.type === 'Cooldown') step.power = { value: 0.4 }
            else step.power = { value: 0.75 }
          }
          if (!step.power.units) {
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
            if (step.type === 'Warmup') step.heartRate = { value: 0.6 }
            else if (step.type === 'Rest') step.heartRate = { value: 0.5 }
            else if (step.type === 'Cooldown') step.heartRate = { value: 0.55 }
            else step.heartRate = { value: 0.75 }
          }
          if (step.distance) step.distance = Number(step.distance)
        }

        // 3. Structural Fixes
        if (step.durationSeconds === undefined && step.duration !== undefined) {
          step.durationSeconds = step.duration
        }

        // 4. Recurse and Calculate
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
            if (typeof step.heartRate.value === 'number') intensity = step.heartRate.value
            else if (step.heartRate.range)
              intensity = (step.heartRate.range.start + step.heartRate.range.end) / 2
          } else if (step.power) {
            if (typeof step.power.value === 'number') intensity = step.power.value
            else if (step.power.range)
              intensity = (step.power.range.start + step.power.range.end) / 2
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

        if (stepDuration > 0 || stepDistance > 0 || (step.steps && step.steps.length > 0)) {
          const reps = Number(step.reps) || 1
          distance += stepDistance * reps
          duration += stepDuration * reps
          tss += stepTSS * reps
        } else {
          console.warn(
            `[GenerateStructure] Skipping invalid step with no duration/distance: ${step.name}`,
            step
          )
        }
      })
      return { distance, duration, tss }
    }

    const totals = normalizeAndCalculate(structure.steps || [])
    const totalDistance = totals.distance
    let totalDuration = totals.duration
    let totalTSS = totals.tss

    if (structure.exercises && Array.isArray(structure.exercises)) {
      let gymDuration = 0
      structure.exercises.forEach((ex: any) => {
        let exDuration = 0
        if (ex.duration) exDuration = ex.duration
        else {
          const sets = ex.sets || 1
          let reps = 10
          if (typeof ex.reps === 'number') reps = ex.reps
          else if (typeof ex.reps === 'string') {
            const match = ex.reps.match(/\d+/)
            if (match) reps = parseInt(match[0], 10)
          }
          const repDuration = 5
          const workTime = sets * reps * repDuration
          let restTimePerSet = 90
          if (ex.rest) {
            const restStr = String(ex.rest).toLowerCase()
            if (restStr.includes('m') && !restStr.includes('ms')) {
              const mins = parseFloat(restStr) || 0
              restTimePerSet = mins * 60
            } else {
              const secs = parseFloat(restStr) || 90
              restTimePerSet = secs
            }
          }
          exDuration = workTime + sets * restTimePerSet
        }
        gymDuration += exDuration
      })
      totalDuration += gymDuration
      if (gymDuration > 0 && totalTSS === 0) {
        totalTSS += (gymDuration / 3600) * 40
      }
    }
    logStage('structure-normalized', {
      totalDistance,
      totalDuration,
      totalTSS: Math.round(totalTSS * 100) / 100
    })

    const hasSteps = Array.isArray(structure.steps) && structure.steps.length > 0
    const hasExercises = Array.isArray(structure.exercises) && structure.exercises.length > 0
    if ((hasSteps || hasExercises) && totalDuration <= 0) {
      throw new Error('Generated structured workout has zero total duration')
    }
    if ((hasSteps || hasExercises) && totalTSS <= 0) {
      throw new Error('Generated structured workout has zero total TSS')
    }

    const updateData: any = { structuredWorkout: structure as any }
    if (totalDistance > 0) updateData.distanceMeters = totalDistance
    if (totalDuration > 0) updateData.durationSec = totalDuration
    if (totalTSS > 0) updateData.tss = Math.round(totalTSS)

    if (totalTSS > 0 && totalDuration > 0) {
      const calculatedIntensity = Math.sqrt((36 * totalTSS) / totalDuration)
      if (!isNaN(calculatedIntensity) && calculatedIntensity > 0) {
        updateData.workIntensity = parseFloat(calculatedIntensity.toFixed(2))
      }
    }

    const updatedWorkout = await (prisma as any).plannedWorkout.update({
      where: { id: plannedWorkoutId },
      data: updateData
    })
    logStage('workout-updated', {
      updatedDurationSec: updatedWorkout.durationSec,
      updatedTss: updatedWorkout.tss,
      updatedIntensity: updatedWorkout.workIntensity
    })

    const isLocal =
      updatedWorkout.syncStatus === 'LOCAL_ONLY' ||
      updatedWorkout.externalId.startsWith('ai_gen_') ||
      updatedWorkout.externalId.startsWith('ai-gen-') ||
      updatedWorkout.externalId.startsWith('adhoc-')

    if (!isLocal) {
      logger.log('Syncing updated structure to Intervals.icu', { plannedWorkoutId })
      const workoutData = {
        title: updatedWorkout.title,
        description: updatedWorkout.description || '',
        type: updatedWorkout.type || '',
        steps: structure.steps || [],
        exercises: structure.exercises,
        messages: [],
        ftp: workout.user.ftp || 250,
        sportSettings: sportSettings || undefined
      }
      const workoutDoc = WorkoutConverter.toIntervalsICU(workoutData)
      const syncResult = await syncPlannedWorkoutToIntervals(
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
          workout_doc: workoutDoc,
          managedBy: updatedWorkout.managedBy
        },
        workout.userId
      )
      logStage('intervals-sync-finished', {
        synced: syncResult.synced,
        syncError: syncResult.error || null
      })

      if (syncResult.synced) {
        await (prisma as any).plannedWorkout.update({
          where: { id: plannedWorkoutId },
          data: { syncStatus: 'SYNCED', lastSyncedAt: new Date(), syncError: null }
        })
      } else {
        await (prisma as any).plannedWorkout.update({
          where: { id: plannedWorkoutId },
          data: { syncError: syncResult.error || 'Failed to sync structured intervals' }
        })
      }
    }

    logStage('completed')
    return { success: true, plannedWorkoutId }
  }
})
