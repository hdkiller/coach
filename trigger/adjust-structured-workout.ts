import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis, buildConciseWorkoutSummary } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import { calculateAge, getUserTimezone } from '../server/utils/date'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { WorkoutConverter } from '../server/utils/workout-converter'
import { syncPlannedWorkoutToIntervals } from '../server/utils/intervals-sync'
import { enforceCyclingCadenceVariation, resolveCyclingCadence } from './utils/cadence'
import {
  resolveWorkoutTargeting,
  type WorkoutTargetingOverride,
  formatTargetPolicyPrompt,
  formatTargetFormatPolicyPrompt,
  STEP_INTENTS,
  applyRunTargetPolicyToStep,
  applyTargetFormatPolicyToStep,
  applyStepIntentGuard,
  buildPlannedWorkoutSettingsSnapshot,
  buildPlannedWorkoutGenerationContext
} from './utils/workout-targeting'
import {
  buildStructureEditFields,
  buildStructurePublishFields
} from '../server/utils/planned-workout-structure-sync'
import { publishActivityEvent } from '../server/utils/activity-realtime'
import { normalizeSwimStructure } from '../server/utils/swim-structure'
import {
  resolveStructuredWorkoutGeneratorMode,
  type StructuredWorkoutGeneratorMode
} from '../server/utils/structured-workout-generator'
import {
  compileWorkoutPlanDraftToStructure,
  isDraftStructuredWorkoutSupported,
  workoutPlanDraftSchema
} from '../server/utils/structured-workout-draft'

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
          intent: {
            type: 'string',
            enum: STEP_INTENTS,
            description:
              'Language-independent interval intent (e.g. endurance, tempo, threshold, vo2).'
          },
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

function inferPowerUnits(power: any): '%' | 'w' {
  const values: number[] = []
  if (typeof power?.value === 'number') values.push(power.value)
  if (typeof power?.range?.start === 'number') values.push(power.range.start)
  if (typeof power?.range?.end === 'number') values.push(power.range.end)
  if (values.length === 0) return '%'
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)))
  return maxAbs > 3 ? 'w' : '%'
}

function toIntensityFactorFromTarget(
  target: any,
  kind: 'heartRate' | 'power' | 'pace',
  refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
): number | null {
  if (!target) return null
  const value =
    typeof target?.value === 'number'
      ? target.value
      : typeof target?.range?.start === 'number' && typeof target?.range?.end === 'number'
        ? (target.range.start + target.range.end) / 2
        : null
  if (value === null || !Number.isFinite(value)) return null
  const units = String(target?.units || '')
    .trim()
    .toLowerCase()
  const clamp = (n: number) => Math.max(0.3, Math.min(1.8, n))
  const zoneToFactor = (z: number) => clamp(0.45 + Math.max(1, Math.min(7, z)) * 0.1)
  const paceValueToMps = (paceValue: number) => {
    if (!Number.isFinite(paceValue) || paceValue <= 0) return null
    if (units.includes('/')) {
      const secondsPerKm = paceValue * 60
      return secondsPerKm > 0 ? 1000 / secondsPerKm : null
    }
    if (units === 'm/s') return paceValue
    if (paceValue > 1.5 && paceValue < 8) return paceValue
    if (refs.thresholdPace > 0) {
      if (paceValue > 3) return paceValue / refs.thresholdPace
      return paceValue * refs.thresholdPace
    }
    return null
  }

  if (kind === 'heartRate') {
    if (units === 'bpm') {
      if (refs.lthr > 0) return clamp(value / refs.lthr)
      if (refs.maxHr > 0) return clamp(value / refs.maxHr)
      return clamp(value > 2 ? value / 100 : value)
    }
    if (units.includes('zone')) return zoneToFactor(value)
    return clamp(value > 2 ? value / 100 : value)
  }

  if (kind === 'power') {
    if (units === 'w' || units === 'watts') {
      if (refs.ftp > 0) return clamp(value / refs.ftp)
      return clamp(value > 3 ? value / 250 : value)
    }
    if (units === 'power_zone' || units.includes('zone') || units.startsWith('z')) {
      return zoneToFactor(value)
    }
    return clamp(value > 3 ? value / 100 : value)
  }

  // pace
  if (units.includes('zone')) return zoneToFactor(value)
  const metersPerSecond = paceValueToMps(value)
  if (metersPerSecond !== null && refs.thresholdPace > 0)
    return clamp(metersPerSecond / refs.thresholdPace)
  return clamp(value > 2 ? value / 100 : value)
}

function getStepIntensity(
  step: any,
  refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number },
  fallbackOrder: Array<'power' | 'heartRate' | 'pace' | 'rpe'>
) {
  const metrics: Array<'heartRate' | 'power' | 'pace' | 'rpe'> = []
  const primaryTarget = String(step?.primaryTarget || '')
  if (
    primaryTarget === 'heartRate' ||
    primaryTarget === 'power' ||
    primaryTarget === 'pace' ||
    primaryTarget === 'rpe'
  ) {
    metrics.push(primaryTarget)
  }
  for (const metric of fallbackOrder) {
    if (!metrics.includes(metric)) metrics.push(metric)
  }

  for (const metric of metrics) {
    if (metric === 'rpe') {
      if (typeof step?.rpe === 'number') return Math.max(0.3, Math.min(1.3, step.rpe / 10))
      continue
    }
    const intensity = toIntensityFactorFromTarget(step?.[metric], metric, refs)
    if (intensity !== null) return intensity
  }

  switch (step?.type) {
    case 'Warmup':
      return 0.5
    case 'Cooldown':
    case 'Rest':
      return 0.4
    default:
      return 0.75
  }
}

function getCoverageThreshold(plannedDurationSec: number) {
  if (plannedDurationSec <= 30 * 60) return 0.8
  if (plannedDurationSec <= 60 * 60) return 0.85
  return 0.9
}

function countWorkBlocks(steps: any[]): number {
  let count = 0
  const visit = (nodes: any[]) => {
    for (const step of nodes || []) {
      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        visit(step.steps)
        continue
      }
      if (step?.type === 'Active') count += 1
    }
  }
  visit(steps)
  return count
}

function hasRepeatBlock(steps: any[]): boolean {
  return (steps || []).some(
    (step: any) =>
      (Number(step?.reps) || Number(step?.repeat) || Number(step?.intervals) || 0) > 1 ||
      (Array.isArray(step?.steps) && hasRepeatBlock(step.steps))
  )
}

function looksLikeIntervalWorkout(workout: any) {
  const text = `${workout?.title || ''} ${workout?.description || ''}`.toLowerCase()
  return /\b(vo2|threshold|tempo|interval|repeats?|x\d+|\d+x)\b/.test(text)
}

function validateStructuredCoverage(params: {
  plannedDurationSec: number
  actualDurationSec: number
  steps: any[]
  workout: any
}) {
  const { plannedDurationSec, actualDurationSec, steps, workout } = params
  if (plannedDurationSec <= 0) {
    return { valid: actualDurationSec > 0, reason: actualDurationSec > 0 ? null : 'zero_duration' }
  }

  const coverage = actualDurationSec / plannedDurationSec
  const minCoverage = getCoverageThreshold(plannedDurationSec)
  if (coverage < minCoverage) {
    return {
      valid: false,
      reason: `duration coverage too low (${Math.round(coverage * 100)}% < ${Math.round(minCoverage * 100)}%)`
    }
  }
  if (coverage > 1.1) {
    return {
      valid: false,
      reason: `duration overshoot too high (${Math.round(coverage * 100)}% > 110%)`
    }
  }

  if (looksLikeIntervalWorkout(workout)) {
    const workBlocks = countWorkBlocks(steps)
    const repeated = hasRepeatBlock(steps)
    if (!repeated && workBlocks < 3) {
      return {
        valid: false,
        reason: 'interval workout is missing enough repeated/main-set work blocks'
      }
    }
  }

  return { valid: true, reason: null }
}

function buildCompactZoneDefinitions(params: {
  workoutType: string
  sportSettings: any
  primaryMetric: string
  loadPreference: string
  ftp: number
  lthr: number
}) {
  const { workoutType, sportSettings, primaryMetric, loadPreference, ftp, lthr } = params
  const parts: string[] = []
  const addZones = (label: string, zones: any[], unit: string, limit = 5) => {
    if (!Array.isArray(zones) || zones.length === 0) return
    const compact = zones
      .slice(0, limit)
      .map((z: any) => `${z.name}: ${z.min}-${z.max}${unit}`)
      .join(' | ')
    if (compact) parts.push(`${label}: ${compact}`)
  }

  if (primaryMetric === 'heartRate')
    addZones(`${workoutType} HR Zones`, sportSettings?.hrZones, ' bpm')
  if (primaryMetric === 'power')
    addZones(`${workoutType} Power Zones`, sportSettings?.powerZones, ' W')
  if (primaryMetric === 'pace')
    addZones(`${workoutType} Pace Zones`, sportSettings?.paceZones, ' m/s')

  if (
    primaryMetric !== 'heartRate' &&
    Array.isArray(sportSettings?.hrZones) &&
    sportSettings.hrZones.length > 0
  ) {
    addZones(`${workoutType} HR Zones`, sportSettings.hrZones, ' bpm', 3)
  }
  if (
    primaryMetric !== 'power' &&
    Array.isArray(sportSettings?.powerZones) &&
    sportSettings.powerZones.length > 0
  ) {
    addZones(`${workoutType} Power Zones`, sportSettings.powerZones, ' W', 3)
  }
  if (
    primaryMetric !== 'pace' &&
    Array.isArray(sportSettings?.paceZones) &&
    sportSettings.paceZones.length > 0
  ) {
    addZones(`${workoutType} Pace Zones`, sportSettings.paceZones, ' m/s', 3)
  }

  if (lthr) parts.push(`Reference LTHR: ${lthr} bpm`)
  if (ftp) parts.push(`Reference FTP: ${ftp} W`)
  if (sportSettings?.thresholdPace) {
    const metersPerSecond = Number(sportSettings.thresholdPace)
    if (metersPerSecond > 0) {
      const secondsPerKm = 1000 / metersPerSecond
      const minutes = Math.floor(secondsPerKm / 60)
      const seconds = Math.round(secondsPerKm % 60)
      parts.push(
        `Reference Threshold Pace: ${metersPerSecond} m/s (${minutes}:${seconds
          .toString()
          .padStart(2, '0')}/km)`
      )
    }
  }
  parts.push(`Preferred Load Metric: ${loadPreference}`)

  return parts.join('\n')
}

export const adjustStructuredWorkoutTask = task({
  id: 'adjust-structured-workout',
  queue: userReportsQueue,
  maxDuration: 180,
  run: async (payload: {
    plannedWorkoutId: string
    adjustments: any
    targetingOverride?: WorkoutTargetingOverride | null
    generatorOverride?: StructuredWorkoutGeneratorMode | null
  }) => {
    const { plannedWorkoutId, adjustments } = payload
    const startedAtMs = Date.now()
    const MAX_DURATION_MS = 180_000
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

    const requestedGeneratorMode = await resolveStructuredWorkoutGeneratorMode(
      workout.userId,
      payload?.generatorOverride || null
    )
    const generatorMode =
      requestedGeneratorMode === 'draft_json_v1' &&
      isDraftStructuredWorkoutSupported(workout.type || '')
        ? requestedGeneratorMode
        : 'legacy_json'
    console.log('[AdjustStructuredWorkout] Generator mode resolved', {
      plannedWorkoutId,
      workoutType: workout.type,
      requestedGeneratorMode,
      generatorMode,
      explicitOverride: payload?.generatorOverride || null
    })
    logStage('resolved-generator-mode', {
      generatorMode,
      requestedGeneratorMode,
      explicitOverride: payload?.generatorOverride || null
    })
    if (requestedGeneratorMode === 'draft_json_v1' && generatorMode !== requestedGeneratorMode) {
      console.log('[AdjustStructuredWorkout] Falling back to legacy generator', {
        plannedWorkoutId,
        workoutType: workout.type,
        requestedGeneratorMode,
        fallbackMode: generatorMode
      })
      logStage('generator-mode-fallback', {
        requestedGeneratorMode,
        fallbackMode: generatorMode,
        workoutType: workout.type
      })
    } else if (generatorMode === 'draft_json_v1') {
      console.log('[AdjustStructuredWorkout] Using compact draft generator', {
        plannedWorkoutId,
        workoutType: workout.type
      })
      logStage('generator-mode-branch', {
        generatorMode,
        implementation: 'compact_draft_v1'
      })
    }

    // Fetch Sport Specific Settings
    const sportSettings = await sportSettingsRepository.getForActivityType(
      workout.userId,
      workout.type || ''
    )
    const { targetPolicy, targetFormatPolicy, loadPreference, priorityText } =
      resolveWorkoutTargeting(sportSettings, payload?.targetingOverride || null)
    logStage('loaded-sport-settings', {
      hasSettings: Boolean(sportSettings),
      hasHrZones: Boolean((sportSettings?.hrZones as any)?.length),
      hasPowerZones: Boolean((sportSettings?.powerZones as any)?.length),
      hasPaceZones: Boolean((sportSettings?.paceZones as any)?.length),
      loadPreference,
      targetPolicyPrimary: targetPolicy.primaryMetric
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
      limit: 4,
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

    const zoneDefinitions = buildCompactZoneDefinitions({
      workoutType: workout.type || '',
      sportSettings,
      primaryMetric: targetPolicy.primaryMetric,
      loadPreference,
      ftp,
      lthr
    })
    const targetPolicyPrompt = formatTargetPolicyPrompt(targetPolicy, loadPreference)
    const targetFormatPolicyPrompt = formatTargetFormatPolicyPrompt(targetFormatPolicy)
    const steadyTargetStyleRule =
      targetPolicy.defaultTargetStyle === 'value'
        ? 'Prefer single-value targets for steady aerobic/endurance/tempo blocks. Use ranges only when the workout explicitly asks for a range or ramp.'
        : 'Prefer metric ranges for steady aerobic/endurance/tempo blocks.'
    const workoutType = String(workout.type || '').toLowerCase()
    const isCycling = workoutType.includes('ride')
    const isRun = workoutType.includes('run')
    const isSwim = workoutType.includes('swim')
    const isStrength = workoutType.includes('gym') || workoutType.includes('weight')
    const sportSpecificInstructions = isCycling
      ? `FOR CYCLING (Ride/VirtualRide):
    - Use % of FTP for power targets (e.g. 0.95 = 95%).
    - Set \`power.units\` to "%" unless the user explicitly requested watts.
    - Include target cadence (RPM).
    - For cadence-focus steps, cadence MUST differ from surrounding steady steps.
    - If HR zones are available, include at least one HR guardrail in coachInstructions.
    - Keep hard interval work recoverable and repeatable.`
      : isRun
        ? `FOR RUNNING (Run):
    - ALWAYS include 'distance' (meters) for each step (estimate if needed).
    - Target selection MUST follow TARGET POLICY priority order: ${priorityText}.
    - Use \`heartRate.units\` = "LTHR" for percentage HR targets and \`pace.units\` = "Pace" for percentage pace targets.
    - ${targetPolicy.allowMixedTargetsPerStep ? 'Mixed metrics in one step are allowed, but primaryTarget still must follow policy.' : 'Use one intensity metric per step unless user feedback explicitly asks for mixed cues.'}
    - ${steadyTargetStyleRule}
    - If user specifies "Zone 2", refer to the provided zones before using generic percentages.
    - Do not stack maximal efforts without sufficient recovery.`
        : isSwim
          ? `FOR SWIMMING (Swim):
    - ALWAYS include 'distance' (meters) for each step (estimate if needed).
    - Use 'stroke' to specify: Free, Back, Breast, Fly, IM, Choice, Kick, Pull.
    - Use 'equipment' array for gear: Fins, Paddles, Snorkel, Pull Buoy.
    - CRITICAL: You MUST include a 'heartRate' object with 'value' (target % of LTHR, e.g. 0.85) for EVERY step.
    - Set \`heartRate.units\` to "LTHR" unless using explicit bpm.
    - RECOMMENDED: Include a 'pace' object with 'value' (target % of threshold pace) for main set intervals.`
          : isStrength
            ? `FOR STRENGTH (Gym/WeightTraining):
    - Instead of 'steps', provide a list of 'exercises'.
    - Each exercise should include practical loading guidance and rest.`
            : `FOR THIS SPORT TYPE:
    - Use only sport-relevant fields and targets.
    - Keep steps explicit, measurable, and safe with clear work/recovery structure.`

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
    - METRIC PRIORITY ORDER: ${priorityText}
    
    USER ZONES:
    ${zoneDefinitions}

    ${targetPolicyPrompt}

    ${targetFormatPolicyPrompt}

    RECENT WORKOUTS (brief):
    ${buildConciseWorkoutSummary(recentWorkouts, timezone)}
    
    JSON RULES:
    - Omit null/empty properties.
    - No placeholder values.
    - Include only sport-relevant keys.
    - Output valid JSON.

    INSTRUCTIONS:
    - Create a NEW JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration (${Math.round((workout.durationSec || 3600) / 60)}m).
    - Respect the user's feedback.
    - Preserve the workout's core objective unless the user explicitly requests changing it.
    - Ensure each block has a clear physiological purpose and logical stress/recovery flow.
    - Do NOT create adjacent steps with identical duration + intensity + cadence unless they are explicitly nested in a repeat block.
    - If a step name implies a focus change, at least one target (power/HR/pace/cadence/RPE) MUST differ from the prior step.
    - **METRIC PRIORITY**:
      - Priority Order: ${priorityText}.
      - Primary metric: ${targetPolicy.primaryMetric}.
      - ${targetPolicy.strictPrimary ? 'Strict primary is enabled: avoid fallback metrics unless absolutely necessary.' : 'Fallback metrics are allowed when the primary metric is unavailable for a step.'}
      - ${targetPolicy.allowMixedTargetsPerStep ? 'Mixed targets in one step are allowed when useful.' : 'Keep one intensity metric per step unless explicitly requested.'}
    - **description**: Use ONLY complete sentences to describe the overall purpose and strategy. **NEVER use bullet points or list the steps here**.
    - MANDATORY: Every step MUST include an \`intent\` enum value (warmup/recovery/easy/endurance/tempo/threshold/vo2/anaerobic/sprint/cooldown/drills/strides).
    - **coachInstructions**: Provide a personalized 2-3 sentence message explaining what changed, why, and the key execution cue.
    - For aerobic/endurance sessions, keep main-set blocks distinct (settle/sustain/technique) rather than generic duplicates.

    ${sportSpecificInstructions}

    Final check: stay within target duration, avoid redundant adjacent steps, and give every step a clear purpose and valid target.

    OUTPUT JSON matching the schema.`
    const draftPrompt = `Adjust this structured ${workout.type} workout plan using the compact planning format.

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
    - METRIC PRIORITY ORDER: ${priorityText}

    USER ZONES:
    ${zoneDefinitions}

    ${targetPolicyPrompt}

    ${targetFormatPolicyPrompt}

    RECENT WORKOUTS (brief):
    ${buildConciseWorkoutSummary(recentWorkouts, timezone)}

    OUTPUT RULES:
    - Return compact JSON only.
    - Use ONE \`target\` object per step, never multiple metric objects.
    - \`target.metric\` must be one of: power, heartRate, pace, rpe.
    - Use \`target.units\` from this set only: %, w, bpm, LTHR, Pace, /km.
    - Use \`durationSeconds\` for timed steps.
    - Use \`distanceMeters\` only when distance is central to the prescription.
    - Use nested \`steps\` plus \`reps\` for repeats.
    - Respect the user's feedback while preserving the workout objective unless explicitly changed.
    - Keep total duration within the planned target.
    - Keep the plan compact and avoid redundant adjacent steps.
    - Every step must have a clear purpose and an \`intent\`.

    SPORT RULES:
    ${sportSpecificInstructions}

    OUTPUT JSON matching the compact draft schema.`
    logStage('prompt-built', {
      promptChars: generatorMode === 'draft_json_v1' ? draftPrompt.length : prompt.length,
      targetDurationMinutes: Math.round((workout.durationSec || 3600) / 60)
    })

    let structure: any
    let promptToUse = prompt
    let totals: { distance: number; duration: number; tss: number } | null = null
    let actualModelUsed = 'flash'
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const aiStartedAt = Date.now()
        const isRetry = attempt > 1
        if (isRetry) actualModelUsed = 'pro'
        if (generatorMode === 'draft_json_v1') {
          const draft = await generateStructuredAnalysis(
            isRetry
              ? `${draftPrompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous draft was rejected or incomplete.\n- Keep the same compact schema.\n- Stay inside duration tolerance and include a complete main set.`
              : draftPrompt,
            workoutPlanDraftSchema,
            'flash',
            {
              userId: workout.userId,
              operation: 'adjust_structured_workout',
              entityType: 'PlannedWorkout',
              entityId: plannedWorkoutId,
              maxRetries: 0,
              modelOverride: isRetry ? 'gemini-3-pro-preview' : undefined,
              thinkingLevelOverride: isRetry ? 'high' : undefined
            }
          )
          console.log('[AdjustStructuredWorkout] Compact draft generated', {
            plannedWorkoutId,
            attempt,
            topLevelSteps: Array.isArray((draft as any)?.steps) ? (draft as any).steps.length : 0,
            hasDescription: Boolean((draft as any)?.description),
            hasCoachInstructions: Boolean((draft as any)?.coachInstructions)
          })
          structure = compileWorkoutPlanDraftToStructure(draft as any)
          console.log('[AdjustStructuredWorkout] Compact draft compiled to structure', {
            plannedWorkoutId,
            attempt,
            compiledSteps: Array.isArray(structure?.steps) ? structure.steps.length : 0
          })
        } else {
          structure = (await generateStructuredAnalysis(
            promptToUse,
            workoutStructureSchema,
            'flash',
            {
              userId: workout.userId,
              operation: 'adjust_structured_workout',
              entityType: 'PlannedWorkout',
              entityId: plannedWorkoutId,
              maxRetries: 0, // We handle retries manually here to change models
              modelOverride: isRetry ? 'gemini-3-pro-preview' : undefined,
              thinkingLevelOverride: isRetry ? 'high' : undefined
            }
          )) as any
        }
        const aiDurationMs = Date.now() - aiStartedAt
        logStage('ai-structure-generated', {
          aiDurationMs,
          attempt,
          model: isRetry ? 'gemini-3-pro-preview' : 'default',
          hasSteps: Array.isArray(structure?.steps),
          stepsCount: Array.isArray(structure?.steps) ? structure.steps.length : 0,
          exercisesCount: Array.isArray(structure?.exercises) ? structure.exercises.length : 0
        })
      } catch (aiError: any) {
        logStage('ai-generation-failed', {
          error: aiError.message,
          attempt
        })
        if (attempt === 1) {
          promptToUse = `${prompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous generation attempt failed (possibly due to complexity or timeout).\n- I am retrying with a more capable model and more thinking budget.\n- Please ensure a complete and valid structure now.`
          continue
        }
        throw aiError
      }

      if (workout.type === 'Swim') {
        normalizeSwimStructure(structure)
      }

      totals = normalizeAndCalculate(structure.steps || [])
      const coverageValidation = validateStructuredCoverage({
        plannedDurationSec: Number(workout.durationSec || 0),
        actualDurationSec: totals.duration,
        steps: structure.steps || [],
        workout
      })
      console.log('[AdjustStructuredWorkout] Coverage validation result', {
        plannedWorkoutId,
        attempt,
        generatorMode,
        plannedDurationSec: Number(workout.durationSec || 0),
        actualDurationSec: totals.duration,
        valid: coverageValidation.valid,
        reason: coverageValidation.reason
      })
      if (coverageValidation.valid) break
      if (attempt >= 2) {
        throw new Error(
          `Adjusted structured workout failed validation: ${coverageValidation.reason}`
        )
      }

      promptToUse = `${prompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous structure was rejected because ${coverageValidation.reason}.\n- You MUST keep the workout within the allowed duration tolerance and include a complete main set matching the workout objective.\n- I am retrying with a more capable model and more thinking budget.\n- Retry with a complete structure now.`
      logStage('ai-structure-retry-requested', {
        attempt,
        reason: coverageValidation.reason
      })
    }

    function normalizeAndCalculate(steps: any[], depth = 0, parentStep: any = null) {
      let distance = 0
      let duration = 0
      let tss = 0

      if (!Array.isArray(steps)) return { distance, duration, tss }

      steps.forEach((step: any, stepIndex: number) => {
        if (!step || typeof step !== 'object' || Array.isArray(step)) {
          logger.warn('Skipping malformed structured workout step during adjustment', {
            workoutId: workout.id,
            depth,
            stepIndex,
            stepType: typeof step
          })
          return
        }

        const recoverTarget = (fieldName: string) => {
          if (typeof step[fieldName] === 'string') {
            step[fieldName] = undefined
          }

          const hasOwnTarget = step.range !== undefined || step.value !== undefined
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

        const ensureTargetObject = (fieldName: 'power' | 'heartRate' | 'pace') => {
          if (typeof step[fieldName] === 'number' && Number.isFinite(step[fieldName])) {
            step[fieldName] = { value: step[fieldName] }
          }
        }

        if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
          recoverTarget('power')
          ensureTargetObject('power')

          if (!step.power || (step.power.value === undefined && !step.power.range)) {
            if (step.type === 'Warmup') step.power = { value: 0.5, units: '%' }
            else if (step.type === 'Rest') step.power = { value: 0.45, units: '%' }
            else if (step.type === 'Cooldown') step.power = { value: 0.4, units: '%' }
            else step.power = { value: 0.75, units: '%' }
          } else if (!step.power.units) {
            step.power.units = inferPowerUnits(step.power)
          }
          applyZoneHintToCyclingPower(step, sportSettings, ftp)

          if (!step.cadence) {
            step.cadence = resolveCyclingCadence(step, parentStep, stepIndex)
          }

          step.stroke = undefined
          step.equipment = undefined
        } else if (workout.type === 'Run') {
          recoverTarget('heartRate')
          recoverTarget('pace')
          recoverTarget('power')
          ensureTargetObject('heartRate')
          ensureTargetObject('pace')
          ensureTargetObject('power')
          if (step.heartRate && !step.heartRate.units) step.heartRate.units = 'LTHR'
          if (step.pace && !step.pace.units) step.pace.units = 'Pace'
          if (step.power && !step.power.units) step.power.units = inferPowerUnits(step.power)
          applyRunTargetPolicyToStep(step, targetPolicy)
          applyTargetFormatPolicyToStep(step, targetFormatPolicy, {
            ftp,
            lthr,
            maxHr,
            thresholdPace: Number(sportSettings?.thresholdPace || 0),
            hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
            powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
            paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
          })
          applyStepIntentGuard(step, {
            ftp,
            lthr,
            thresholdPace: Number(sportSettings?.thresholdPace || 0)
          })
          if (step.distance) step.distance = Number(step.distance)
        } else {
          applyTargetFormatPolicyToStep(step, targetFormatPolicy, {
            ftp,
            lthr,
            maxHr,
            thresholdPace: Number(sportSettings?.thresholdPace || 0),
            hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
            powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
            paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
          })
          applyStepIntentGuard(step, {
            ftp,
            lthr,
            thresholdPace: Number(sportSettings?.thresholdPace || 0)
          })
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

          const intensity = getStepIntensity(
            step,
            {
              ftp,
              lthr,
              maxHr,
              thresholdPace: Number(sportSettings?.thresholdPace || 0)
            },
            targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>
          )

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

    const computedTotals = totals || normalizeAndCalculate(structure.steps || [])
    if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
      enforceCyclingCadenceVariation(structure)
    }
    const totalDistance = computedTotals.distance
    const totalDuration = computedTotals.duration
    const totalTSS = computedTotals.tss
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

    const settingsSnapshot = buildPlannedWorkoutSettingsSnapshot(
      sportSettings,
      { ftp, lthr, maxHr },
      targetPolicy,
      targetFormatPolicy
    )
    const generationContext = buildPlannedWorkoutGenerationContext({
      operation: 'adjust',
      generatorMode,
      workout,
      targetPolicy,
      targetFormatPolicy,
      loadPreference,
      timezone,
      model: actualModelUsed as any,
      recentWorkoutsCount: recentWorkouts.length,
      goal:
        workout.trainingWeek?.block.plan.goal?.title ||
        workout.trainingWeek?.block.plan.name ||
        'General Fitness',
      phase: workout.trainingWeek?.block.type || 'General',
      focus: workout.trainingWeek?.block.primaryFocus || 'Fitness',
      persona: workout.user.aiPersona || undefined,
      adjustments
    })

    const updateData: any = {
      ...buildStructureEditFields(structure, 'AI')
    }

    if (totalDistance > 0) updateData.distanceMeters = totalDistance
    if (totalDuration > 0) updateData.durationSec = totalDuration
    if (totalTSS > 0) updateData.tss = Math.round(totalTSS)
    updateData.lastGenerationSettingsSnapshot = settingsSnapshot
    updateData.lastGenerationContext = generationContext
    if (!(workout as any).createdFromSettingsSnapshot) {
      updateData.createdFromSettingsSnapshot = settingsSnapshot
    }
    if (totalTSS > 0 && totalDuration > 0) {
      updateData.workIntensity = parseFloat(Math.sqrt((36 * totalTSS) / totalDuration).toFixed(2))
    }

    const updatedWorkout = await prisma.plannedWorkout.update({
      where: { id: plannedWorkoutId },
      data: updateData
    })
    await publishActivityEvent(updatedWorkout.userId, {
      scope: 'calendar',
      entityType: 'planned_workout',
      entityId: updatedWorkout.id,
      reason: 'updated'
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
        sportSettings: sportSettings || undefined,
        generationSettingsSnapshot: settingsSnapshot
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
          managedBy: updatedWorkout.managedBy,
          workout_doc: workoutDoc
        },
        workout.userId
      )
      if (syncResult.synced) {
        const syncedWorkout = await prisma.plannedWorkout.update({
          where: { id: plannedWorkoutId },
          data: {
            ...buildStructurePublishFields(structure),
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
            syncError: null
          }
        })
        await publishActivityEvent(syncedWorkout.userId, {
          scope: 'calendar',
          entityType: 'planned_workout',
          entityId: syncedWorkout.id,
          reason: 'updated'
        })
      }
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
