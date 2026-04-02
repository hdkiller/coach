import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis, buildConciseWorkoutSummary } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import { syncPlannedWorkoutToIntervals } from '../server/utils/intervals-sync'
import { WorkoutConverter } from '../server/utils/workout-converter'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import { checkQuota } from '../server/utils/quotas/engine'
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
import { normalizeStructuredStrengthWorkout } from '../server/utils/strength-exercise-library'
import {
  applyStrengthLibraryDefaultsToWorkout,
  validateStrengthStructuredWorkout
} from '../server/utils/strength-exercise-matching'
import {
  resolveStructuredWorkoutGeneratorMode,
  type StructuredWorkoutGeneratorMode
} from '../server/utils/structured-workout-generator'
import {
  compileWorkoutPlanDraftToStructure,
  isDraftStructuredWorkoutSupported,
  workoutPlanDraftSchema
} from '../server/utils/structured-workout-draft'
import {
  estimateStepDistanceMeters,
  estimateStepDurationSeconds,
  normalizeStructuredWorkoutForPersistence,
  selectStepIntensity,
  computeStrengthExerciseMetrics
} from '../server/utils/structured-workout-persistence'

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
                },
                cadence: {
                  type: 'integer',
                  description: 'Target cadence in RPM (single integer)'
                },
                cadenceRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'integer', minimum: 1 },
                    end: { type: 'integer', minimum: 1 }
                  },
                  required: ['start', 'end'],
                  description: 'Target cadence range for this step (e.g. 85-95 RPM).'
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
    },
    blocks: {
      type: 'array',
      description: 'Canonical strength workout structure grouped into blocks',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['warmup', 'single_exercise', 'cooldown', 'superset', 'circuit']
          },
          title: { type: 'string' },
          notes: { type: 'string' },
          durationSec: { type: 'integer', minimum: 1 },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                libraryExerciseId: { type: 'string' },
                videoUrl: { type: 'string' },
                notes: { type: 'string' },
                movementPattern: {
                  type: 'string',
                  enum: ['squat', 'hinge', 'push', 'pull', 'lunge', 'core', 'carry', 'mobility']
                },
                intent: {
                  type: 'string',
                  enum: ['max_strength', 'power', 'muscular_endurance', 'prehab']
                },
                prescriptionMode: {
                  type: 'string',
                  enum: [
                    'reps',
                    'reps_per_side',
                    'duration',
                    'distance_meters',
                    'distance_km',
                    'distance_ft',
                    'distance_yd',
                    'distance_miles'
                  ]
                },
                loadMode: {
                  type: 'string',
                  enum: [
                    'none',
                    'generic',
                    'weight_lb',
                    'weight_kg',
                    'weight_per_side_lb',
                    'weight_per_side_kg'
                  ]
                },
                defaultRest: { type: 'string' },
                showRestColumn: { type: 'boolean' },
                setRows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                      loadValue: { type: 'string' },
                      restOverride: { type: 'string' }
                    }
                  }
                }
              },
              required: ['name']
            }
          }
        },
        required: ['type', 'title', 'steps']
      }
    }
  },
  required: ['coachInstructions']
}

function parseSingleZoneFromName(stepName: unknown): number | null {
  if (typeof stepName !== 'string' || stepName.trim().length === 0) return null
  const matches = Array.from(stepName.matchAll(/\bZ([1-7])\b/gi))
  const uniqueZones = Array.from(new Set(matches.map((m) => Number(m[1]))))
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

function getCoverageBounds(workout: any, plannedDurationSec: number, preserveStructure?: boolean) {
  if (preserveStructure) {
    return { minCoverage: 0.95, maxCoverage: 1.05 }
  }

  const workoutType = String(workout?.type || '').toLowerCase()
  if (workoutType.includes('gym') || workoutType.includes('weight')) {
    const absoluteToleranceRatio = plannedDurationSec > 0 ? 600 / plannedDurationSec : 0
    return {
      minCoverage: 0.7,
      maxCoverage: Math.min(1.35, 1 + Math.max(0.15, absoluteToleranceRatio))
    }
  }

  if (workoutType.includes('swim')) {
    return { minCoverage: 0.7, maxCoverage: 1.2 }
  }

  return {
    minCoverage: getCoverageThreshold(plannedDurationSec),
    maxCoverage: 1.1
  }
}

function validateStructuredCoverage(params: {
  plannedDurationSec: number
  actualDurationSec: number
  steps: any[]
  workout: any
  preserveStructure?: boolean
}) {
  const { plannedDurationSec, actualDurationSec, steps, workout, preserveStructure } = params
  if (plannedDurationSec <= 0) {
    return { valid: actualDurationSec > 0, reason: actualDurationSec > 0 ? null : 'zero_duration' }
  }

  const coverage = actualDurationSec / plannedDurationSec
  const { minCoverage, maxCoverage } = getCoverageBounds(
    workout,
    plannedDurationSec,
    preserveStructure
  )
  if (coverage < minCoverage) {
    return {
      valid: false,
      reason: `duration coverage too low (${Math.round(coverage * 100)}% < ${Math.round(minCoverage * 100)}%)`
    }
  }
  if (coverage > maxCoverage) {
    return {
      valid: false,
      reason: `duration overshoot too high (${Math.round(coverage * 100)}% > ${Math.round(maxCoverage * 100)}%)`
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

function summarizeStructuredWorkoutForPrompt(structuredWorkout: any): string {
  if (!structuredWorkout || typeof structuredWorkout !== 'object') return 'None.'

  const lines: string[] = []
  if (typeof structuredWorkout.description === 'string' && structuredWorkout.description.trim()) {
    lines.push(`Overall description: ${structuredWorkout.description.trim()}`)
  }

  const summarizeStep = (step: any, depth = 0): string[] => {
    if (!step || typeof step !== 'object') return []

    const indent = '  '.repeat(depth)
    const bits: string[] = []
    const reps = Number(step.reps) || 0
    const type = step.type || 'Step'
    const name = step.name ? ` - ${step.name}` : ''
    bits.push(`${indent}- ${type}${name}`)

    const attrs: string[] = []
    if (Number(step.durationSeconds) > 0) attrs.push(`${Math.round(Number(step.durationSeconds))}s`)
    if (Number(step.distance) > 0) attrs.push(`${Math.round(Number(step.distance))}m`)
    if (reps > 1) attrs.push(`reps x${reps}`)
    if (step.intent) attrs.push(`intent=${step.intent}`)
    if (attrs.length > 0) bits[0] += ` (${attrs.join(', ')})`

    if (Array.isArray(step.steps) && step.steps.length > 0) {
      for (const child of step.steps) bits.push(...summarizeStep(child, depth + 1))
    }

    return bits
  }

  if (Array.isArray(structuredWorkout.steps) && structuredWorkout.steps.length > 0) {
    lines.push('Current step outline:')
    for (const step of structuredWorkout.steps) lines.push(...summarizeStep(step))
  }

  if (Array.isArray(structuredWorkout.exercises) && structuredWorkout.exercises.length > 0) {
    lines.push('Current exercises:')
    for (const exercise of structuredWorkout.exercises.slice(0, 12)) {
      const attrs: string[] = []
      if (Number(exercise.sets) > 0) attrs.push(`${exercise.sets} sets`)
      if (exercise.reps) attrs.push(`${exercise.reps} reps`)
      if (exercise.rest) attrs.push(`rest ${exercise.rest}`)
      lines.push(`- ${exercise.name || 'Exercise'}${attrs.length ? ` (${attrs.join(', ')})` : ''}`)
    }
  }

  return lines.join('\n') || 'None.'
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
  if (sportSettings?.warmupTime) parts.push(`Default Warmup: ${sportSettings.warmupTime} min`)
  if (sportSettings?.cooldownTime) parts.push(`Default Cooldown: ${sportSettings.cooldownTime} min`)

  return parts.join('\n')
}

export const generateStructuredWorkoutTask = task({
  id: 'generate-structured-workout',
  queue: userReportsQueue,
  maxDuration: 180,
  run: async (payload: {
    plannedWorkoutId?: string
    workoutTemplateId?: string
    targetingOverride?: WorkoutTargetingOverride | null
    generatorOverride?: StructuredWorkoutGeneratorMode | null
  }) => {
    const { plannedWorkoutId, workoutTemplateId } = payload
    const entityId = plannedWorkoutId || workoutTemplateId
    const entityType = plannedWorkoutId ? 'PlannedWorkout' : 'WorkoutTemplate'
    const startedAtMs = Date.now()
    const MAX_DURATION_MS = 180_000
    const STRUCTURED_WORKOUT_TIMEOUT_MS = 45_000
    const logStage = (stage: string, meta: Record<string, any> = {}) => {
      const elapsedMs = Date.now() - startedAtMs
      logger.log(`[GenerateStructuredWorkout] ${stage}`, {
        entityId,
        entityType,
        elapsedMs,
        remainingMs: Math.max(0, MAX_DURATION_MS - elapsedMs),
        ...meta
      })
    }

    logStage('start')

    let workout: any = null
    if (plannedWorkoutId) {
      workout = await (prisma as any).plannedWorkout.findUnique({
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
              isAdmin: true,
              aiContext: true,
              language: true
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
    } else if (workoutTemplateId) {
      workout = await (prisma as any).workoutTemplate.findUnique({
        where: { id: workoutTemplateId },
        include: {
          user: {
            select: {
              ftp: true,
              lthr: true,
              aiPersona: true,
              name: true,
              maxHr: true,
              subscriptionTier: true,
              isAdmin: true,
              aiContext: true,
              language: true
            }
          }
        }
      })
    }

    if (!workout) {
      logger.warn('Workout not found, skipping structured generation', { entityId, entityType })
      return { success: false, error: 'Workout not found' }
    }
    logStage('loaded-workout', {
      userId: workout.userId,
      type: workout.type,
      hasExistingStructure: Boolean(workout.structuredWorkout),
      durationSec: workout.durationSec,
      isTemplate: entityType === 'WorkoutTemplate'
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
    console.log('[GenerateStructuredWorkout] Generator mode resolved', {
      entityId,
      entityType,
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
      console.log('[GenerateStructuredWorkout] Falling back to legacy generator', {
        entityId,
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
      console.log('[GenerateStructuredWorkout] Using compact draft generator', {
        entityId,
        workoutType: workout.type
      })
      logStage('generator-mode-branch', {
        generatorMode,
        implementation: 'compact_draft_v1'
      })
    }

    // Check Quota
    try {
      await checkQuota(workout.userId, 'generate_structured_workout')
    } catch (quotaError: any) {
      if (quotaError.statusCode === 429) {
        logger.warn('Structured workout generation quota exceeded', {
          userId: workout.userId,
          entityId
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

    // Fetch recent workouts for context (Limit to 7 with concise summary to balance context vs speed)
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
    const thresholdPace = sportSettings?.thresholdPace || 0
    const aiContext = workout.user.aiContext || ''

    // Subscription Limit Check
    // Free users cannot generate structured workouts more than 4 weeks (28 days) in the future
    if (entityType === 'PlannedWorkout' && workout.user.subscriptionTier === 'FREE') {
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

    const warmupTime = sportSettings?.warmupTime || 10
    const cooldownTime = sportSettings?.cooldownTime || 5
    const preserveExistingStructure = Boolean(workout.structuredWorkout)
    const existingStructureSummary = preserveExistingStructure
      ? summarizeStructuredWorkoutForPrompt(workout.structuredWorkout)
      : ''
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
        ? "Prefer 'heartRate.value', 'pace.value', or 'power.value' for steady aerobic/endurance/tempo blocks. Use ranges only when the workout explicitly asks for a range or ramp."
        : "Prefer 'heartRate.range', 'pace.range', or 'power.range' for steady aerobic/endurance/tempo blocks."
    const workoutType = String(workout.type || '').toLowerCase()
    const isCycling = workoutType.includes('ride')
    const isRun = workoutType.includes('run')
    const isSwim = workoutType.includes('swim')
    const isStrength = workoutType.includes('gym') || workoutType.includes('weight')
    const runPaceUnitInstruction =
      targetFormatPolicy.pace.mode === 'absolutePace'
        ? `- CRITICAL: If the workout request calls for absolute pace or includes examples like "5:20-5:40 min/km", encode those as explicit pace targets. Use 'pace.units' = "/km" with decimal minute values (for example 5.33-5.67 for 5:20-5:40/km), set 'primaryTarget' to 'pace' for those steps, and do NOT fall back to unlabeled percentages or power targets.`
        : `- Use 'heartRate.units' = "LTHR" for percentage HR targets and 'pace.units' = "Pace" for percentage pace targets.`
    const sportSpecificInstructions = isCycling
      ? `FOR CYCLING (Ride/VirtualRide):
    - MANDATORY: Use % of FTP for power targets (e.g. 0.95 = 95%) for EVERY step.
    - Set 'power.units' to "%" unless there is an explicit reason to use "w".
    - For ramps (Warmup/Cooldown), use "range" with "start" and "end" values (e.g. start: 0.50, end: 0.75 for warmup).
    - MANDATORY: Include target "cadence" (RPM) for EVERY step (including Warmup/Rest). 
      * Use 85-95 for active, 80 for rest UNLESS specific user preferences are provided in the CONTEXT above (e.g. "70-85rpm").
    - For cadence-focus steps, cadence MUST differ from surrounding steady steps (e.g. steady 85-90, focus 95-100) and power should be adjusted if needed.
    - For aerobic rides, avoid repeated identical 20+ minute blocks unless deliberate repeats are requested.
    - If HR zones are available, include at least one HR guardrail in coachInstructions (e.g. cap near top of aerobic zone).
    - For interval sets, include realistic recovery between hard repetitions and maintain repeatability of quality efforts.`
      : isRun
        ? `FOR RUNNING (Run):
    - Steps should have 'type', 'durationSeconds', 'name'.
    - ALWAYS include 'distance' (meters) for each step. If duration-based, ESTIMATE the distance based on the intensity/pace.
    - Target selection MUST follow TARGET POLICY priority order: ${priorityText}.
    - ${runPaceUnitInstruction}
    - ${targetPolicy.allowMixedTargetsPerStep ? 'Mixed metrics in one step are allowed, but the policy primary metric must still be explicit as primaryTarget.' : 'Use one intensity metric per step unless the workout request explicitly asks for mixed cues.'}
    - ${steadyTargetStyleRule}
    - DO NOT rely solely on description for intensity. Provide an estimated target object for every step.
    - Steps must represent runnable in-session segments only (jog, run, walk recoveries, drills performed during the run).
    - Do NOT add static stretching or off-feet recovery blocks to the structured plan.
    - Respect quality spacing: avoid stacking maximal efforts without enough recovery.`
        : isSwim
          ? `FOR SWIMMING (Swim):
    - Prefer 'distanceMeters' for pool reps and lengths. Use 'durationSeconds' only when time-based structure is genuinely better.
    - Use 'stroke' to specify: Free, Back, Breast, Fly, IM, Choice, Kick, Pull.
    - Use 'equipment' array for gear: Fins, Paddles, Snorkel, Pull Buoy.
    - Use 'sendoffSeconds' when the set is written on a send-off and 'restSeconds' when explicit rest matters.
    - Use 'targetSplit' (e.g. "1:40/100m") or 'cssPercent' when swim pacing is central to the set.
    - Use one intensity cue per step when possible. Do NOT force heart-rate targets for every swim step.
    - Technical/drill steps can omit target intensity if stroke, distance, send-off, or rest already defines the task clearly.
    - CRITICAL: The full pool session must realistically land near the planned duration once swim pace, send-offs, and rests are considered.
    - For sessions 45 minutes or longer, include enough total volume and explicit recoveries/send-offs to fill the assigned time.
    - Prefer explicit 'sendoffSeconds' or 'restSeconds' on repeated sets instead of leaving recovery implied.
    - Before returning, sanity-check the total session time yourself and expand or trim the set so it stays close to the planned duration.`
          : isStrength
            ? `FOR STRENGTH (Gym/WeightTraining):
    - Prefer the canonical strength schema: provide 'blocks' instead of a flat 'exercises' list.
    - Each block should have: 'type', 'title', optional 'notes', and 'steps'.
    - Use block types like 'warmup', 'single_exercise', 'superset', 'circuit', 'cooldown'.
    - Each step should have 'name', optional 'notes', optional 'intent'/'movementPattern', and 'setRows'.
    - Each step should also set a shared 'prescriptionMode' (default 'reps'), optional 'loadMode', and optional 'defaultRest'.
    - Each entry in 'setRows' represents one set and may contain:
      * 'value' for reps, reps/side, duration, or distance depending on prescriptionMode
      * 'loadValue' for load/weight when relevant
      * 'restOverride' only when a specific set differs from defaultRest
    - Example: a 3x8 squat with ramping load should use one step with 3 setRows, not 3 separate exercises.
    - CRITICAL: Return native 'blocks' for strength. Do NOT return interval-style top-level 'steps' for WeightTraining.
    - CRITICAL: Loaded lifts must use real per-set prescription. Do NOT prescribe main lifts as one long duration row such as 1 x 900 seconds.
    - Time-based mobility like foam rolling should use prescriptionMode='duration' with setRows.value in seconds.
    - Structure the session as Warmup -> Main Lifts -> Accessories -> Cooldown when appropriate.
    - Only fall back to a flat 'exercises' list if you truly cannot express the workout as blocks.`
            : `FOR THIS SPORT TYPE:
    - Use only sport-relevant fields and targets.
    - Keep steps explicit, measurable, and safe with clear work/recovery structure.`

    const prompt = `Design a structured ${workout.type} workout for ${workout.user.name || 'Athlete'}.
    
    TITLE: ${workout.title}
    DURATION: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    INTENSITY: ${workout.workIntensity || 'Moderate'}
    DESCRIPTION: ${workout.description || 'No specific description'}
    USER FTP: ${ftp}W
    USER LTHR: ${lthr} bpm
    TYPE: ${workout.type}
    PREFERRED INTENSITY METRIC: ${loadPreference}
    METRIC PRIORITY ORDER: ${priorityText}
    PREFERRED LANGUAGE: ${workout.user.language || 'English'} (CRITICAL: ALL text fields like "description" and "coachInstructions" MUST be written in this language)
    
    CONTEXT:
    - Goal: ${goal}
    - Phase: ${phase}
    - Focus: ${focus}
    - Coach Persona: ${persona}
    ${aiContext ? `- User Preferences/Context: ${aiContext}` : ''}
    
    RECENT WORKOUTS (brief):
    ${buildConciseWorkoutSummary(recentWorkouts, timezone)}

    ${preserveExistingStructure ? `EXISTING STRUCTURE TO PRESERVE:\n${existingStructureSummary}` : ''}

    Use the user's specific zones and references below for this activity type.

    ${zoneDefinitions}

    ${targetPolicyPrompt}

    ${targetFormatPolicyPrompt}

    When generating "[Zone 2]" workouts, target ONLY the user's defined Z2 range for this specific sport. Never use generic percentages - always reference the provided zones first.
    
    JSON RULES:
    - Omit null/empty properties.
    - Every step must have non-zero durationSeconds.
    - Output valid JSON only.
    - No placeholder values.
    - Include only sport-relevant keys.

    INSTRUCTIONS:
    - Create a JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration exactly.
    - ${preserveExistingStructure ? 'This is a REGENERATION of an existing workout structure. Preserve the same session identity: keep the overall objective, block order, repeat/set pattern, and approximate work/recovery distribution unless the workout title or description clearly requires a different design.' : 'If no prior structure exists, build the session from scratch.'}
    - ${preserveExistingStructure ? 'Improve clarity, targeting, and coach cues without inventing a materially different workout.' : 'Build a complete structure that fits the planned session.'}
    - Use repeat blocks with "reps" for repetitive interval sets.
    - Every workout must have a clear physiological objective (e.g. aerobic endurance, threshold, VO2, neuromuscular, recovery) and each block should support that objective.
    - Sequence intensity logically (warm-up -> quality work -> recovery -> cooldown). Avoid random intensity jumps.
    - Do NOT create adjacent steps with identical duration + intensity + cadence unless they are explicitly nested in a repeat block.
    - If a step name implies a focus change (e.g. cadence focus), at least one target (power/HR/pace/cadence/RPE) MUST differ from the prior step.
    - Include only in-session workout steps the athlete performs as part of the session itself.
    - Do NOT include stretching, foam rolling, mobility, breathing exercises, or post-workout recovery as structured steps.
    - Put post-workout recovery guidance in coachInstructions, not in steps.
    - **METRIC PRIORITY**: Respect the user's TARGET POLICY and preferred order (${loadPreference}).
      - Priority Order: ${priorityText}.
      - Primary metric for each step should be: ${targetPolicy.primaryMetric}.
      - ${targetPolicy.strictPrimary ? 'Strict primary is enabled: avoid fallback metrics unless absolutely necessary.' : 'Fallback metrics are allowed when the primary metric is not usable for a specific step.'}
      - ${targetPolicy.allowMixedTargetsPerStep ? 'Mixed targets in one step are allowed when they add useful execution context.' : 'Do not include multiple intensity targets in a single step unless explicitly requested.'}
      - NEVER duplicate a workout step just to provide a different intensity metric. One step = one time block.
    - **steps**: All rules below (targets, etc.) apply to BOTH top-level steps AND nested steps inside repeats.
    - MANDATORY: Every step MUST include an \`intent\` enum value (warmup/recovery/easy/endurance/tempo/threshold/vo2/anaerobic/sprint/cooldown/drills/strides).
    - **description**: Use ONLY complete sentences to describe the overall purpose and strategy. **NEVER use bullet points or list the steps here**.
    - **coachInstructions**: Provide a personalized 2-3 sentence message explaining why this workout matters and the key execution cue. Use the "${persona}" persona tone.
    - **Warmup/Cooldown**: Use the user's default durations (${warmupTime} minutes for Warmup, ${cooldownTime} minutes for Cooldown) unless the workout TITLE or DESCRIPTION explicitly asks for a different specific duration.
    - For aerobic/endurance workouts, create at least 2 distinct main-set sub-blocks with clear purpose (settle, sustain, technique/cadence or control), not one repeated generic block.
    - For Zone 2 workouts, keep primary targets inside the user's provided endurance/aerobic zones whenever available.

    ${sportSpecificInstructions}

    Final check: stay within target duration, avoid redundant adjacent steps, give every step a clear purpose and valid primary target.

    OUTPUT JSON matching the schema.`
    const draftPrompt = `Design a structured ${workout.type} workout plan for ${workout.user.name || 'Athlete'} using a compact planning format.

    TITLE: ${workout.title}
    DURATION: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    INTENSITY: ${workout.workIntensity || 'Moderate'}
    DESCRIPTION: ${workout.description || 'No specific description'}
    USER FTP: ${ftp}W
    USER LTHR: ${lthr} bpm
    TYPE: ${workout.type}
    PREFERRED INTENSITY METRIC: ${loadPreference}
    METRIC PRIORITY ORDER: ${priorityText}
    PREFERRED LANGUAGE: ${workout.user.language || 'English'} (CRITICAL: All text fields must use this language)

    CONTEXT:
    - Goal: ${goal}
    - Phase: ${phase}
    - Focus: ${focus}
    - Coach Persona: ${persona}
    ${aiContext ? `- User Preferences/Context: ${aiContext}` : ''}

    RECENT WORKOUTS (brief):
    ${buildConciseWorkoutSummary(recentWorkouts, timezone)}

    ${preserveExistingStructure ? `EXISTING STRUCTURE TO PRESERVE:\n${existingStructureSummary}` : ''}

    ${zoneDefinitions}

    ${targetPolicyPrompt}

    ${targetFormatPolicyPrompt}

    OUTPUT RULES:
    - Return compact JSON only.
    - Use ONE \`target\` object per step, never multiple metric objects.
    - \`target.metric\` must be one of: power, heartRate, pace, rpe.
    - Use \`target.units\` from this set only: %, w, bpm, LTHR, Pace, /km.
    - CRITICAL: For percentage targets, use decimal fractions, not whole percents. Example: 80% LTHR must be \`0.80\` with \`units: "LTHR"\`; 95% FTP must be \`0.95\` with \`units: "%"\`.
    - Use \`durationSeconds\` for timed steps.
    - Use \`distanceMeters\` only when distance is central to the prescription.
    - Use nested \`steps\` plus \`reps\` for repeats.
    - Every step must have a clear purpose and an \`intent\`.
    - Include only in-session workout steps. Do NOT include stretching, foam rolling, mobility, breathing exercises, or post-workout recovery as steps.
    - Put post-workout recovery guidance in \`coachInstructions\`, not in \`steps\`.
    - Keep total duration within the planned target.
    - Keep the plan compact and avoid redundant adjacent steps.
    - ${preserveExistingStructure ? 'Preserve the session identity and structure unless the workout clearly requires change.' : 'Build the full session from scratch.'}

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
              operation: 'generate_structured_workout',
              entityType,
              entityId: entityId!,
              maxRetries: 0,
              timeoutMs: STRUCTURED_WORKOUT_TIMEOUT_MS,
              modelOverride: isRetry ? 'gemini-3-pro-preview' : undefined,
              thinkingLevelOverride: isRetry ? 'high' : undefined
            }
          )
          console.log('[GenerateStructuredWorkout] Compact draft generated', {
            entityId,
            attempt,
            topLevelSteps: Array.isArray((draft as any)?.steps) ? (draft as any).steps.length : 0,
            hasDescription: Boolean((draft as any)?.description),
            hasCoachInstructions: Boolean((draft as any)?.coachInstructions)
          })
          structure = compileWorkoutPlanDraftToStructure(draft as any)
          console.log('[GenerateStructuredWorkout] Compact draft compiled to structure', {
            entityId,
            attempt,
            compiledSteps: Array.isArray(structure?.steps) ? structure.steps.length : 0
          })
        } else {
          structure = await generateStructuredAnalysis(
            promptToUse,
            workoutStructureSchema,
            'flash',
            {
              userId: workout.userId,
              operation: 'generate_structured_workout',
              entityType,
              entityId: entityId!,
              maxRetries: 0, // We handle retries manually here to change models
              timeoutMs: STRUCTURED_WORKOUT_TIMEOUT_MS,
              modelOverride: isRetry ? 'gemini-3-pro-preview' : undefined,
              thinkingLevelOverride: isRetry ? 'high' : undefined
            }
          )
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

      const rawStrengthStructure = isStrength ? JSON.parse(JSON.stringify(structure || {})) : null

      if (isStrength) {
        structure = normalizeStructuredStrengthWorkout(structure)
        const applyStrengthLibraryDefaults =
          (workout.user as any)?.featureFlags?.structuredWorkout?.strength?.applyLibraryDefaults !==
          false

        if (applyStrengthLibraryDefaults) {
          const libraryExercises = await (prisma as any).strengthExerciseLibraryItem.findMany({
            where: { userId: workout.userId },
            orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }]
          })
          const matchResult = await applyStrengthLibraryDefaultsToWorkout({
            structuredWorkout: structure,
            libraryExercises,
            userId: workout.userId,
            entityType,
            entityId: entityId!,
            operation: 'match_strength_exercise_defaults'
          })
          structure = normalizeStructuredStrengthWorkout(matchResult.structuredWorkout)
          logStage('strength-library-defaults-applied', {
            matchedCount: matchResult.matchedCount,
            libraryCount: libraryExercises.length
          })
        }

        const strengthValidation = validateStrengthStructuredWorkout(
          rawStrengthStructure,
          structure
        )
        if (!strengthValidation.valid) {
          if (attempt >= 2) {
            throw new Error(
              `Generated structured workout failed strength validation: ${strengthValidation.reason}`
            )
          }

          promptToUse = `${prompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous strength structure was rejected because ${strengthValidation.reason}.\n- Return native strength 'blocks' with exercise 'steps' and per-set 'setRows'.\n- Loaded lifts must use real sets/reps/load, not one long duration block.\n- Retry with a complete and realistic strength prescription now.`
          logStage('strength-validation-retry-requested', {
            attempt,
            reason: strengthValidation.reason
          })
          continue
        }
      }

      structure = normalizeStructuredWorkoutForPersistence(structure, {
        refs: {
          ftp,
          lthr,
          maxHr,
          thresholdPace,
          hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
          powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
          paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
        },
        targetPolicy,
        targetFormatPolicy,
        workoutType: workout.type || ''
      })

      totals = normalizeAndCalculate(structure.steps || [])
      const validationStrengthMetrics =
        Array.isArray(structure.exercises) && structure.exercises.length > 0
          ? computeStrengthExerciseMetrics(structure.exercises)
          : { durationSec: 0, tss: 0, workIntensity: null }
      const validationDurationSec = totals.duration + validationStrengthMetrics.durationSec
      const coverageValidation = validateStructuredCoverage({
        plannedDurationSec: Number(workout.durationSec || 0),
        actualDurationSec: validationDurationSec,
        steps: structure.steps || [],
        workout,
        preserveStructure: preserveExistingStructure
      })
      console.log('[GenerateStructuredWorkout] Coverage validation result', {
        entityId,
        attempt,
        generatorMode,
        plannedDurationSec: Number(workout.durationSec || 0),
        actualDurationSec: validationDurationSec,
        valid: coverageValidation.valid,
        reason: coverageValidation.reason
      })
      if (coverageValidation.valid) break
      if (attempt >= 2) {
        throw new Error(
          `Generated structured workout failed validation: ${coverageValidation.reason}`
        )
      }

      const swimCoverageFeedback =
        workout.type === 'Swim'
          ? '\n- For swim workouts, explicitly account for pool time using total volume plus sendoffSeconds/restSeconds and targetSplit when appropriate.\n- If the previous swim plan was too short, add enough distance, repeats, or explicit recovery to reach the planned session time.\n- Do not leave repeated swim set recovery implied if it affects total duration.'
          : ''
      promptToUse = `${prompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous structure was rejected because ${coverageValidation.reason}.\n- You MUST keep the workout within the allowed duration tolerance and include a complete main set matching the workout objective.${swimCoverageFeedback}\n- I am retrying with a more capable model and more thinking budget.\n- Retry with a complete structure now.`
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
          logger.warn('Skipping malformed structured workout step during generation', {
            workoutType: workout.type,
            depth,
            stepIndex,
            stepType: typeof step
          })
          return
        }

        // 1. Recover misplaced targets (AI sometimes puts 'value' or 'range' at top level)
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

        // 2. Sport-Specific Normalization
        if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
          recoverTarget('power')
          ensureTargetObject('power')
          if (!step.power || (step.power.value === undefined && !step.power.range)) {
            if (step.type === 'Warmup') step.power = { value: 0.5 }
            else if (step.type === 'Rest') step.power = { value: 0.45 }
            else if (step.type === 'Cooldown') step.power = { value: 0.4 }
            else step.power = { value: 0.75 }
          }
          if (!step.power.units) {
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
            thresholdPace,
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
            thresholdPace,
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
          stepDuration = estimateStepDurationSeconds(step, {
            refs: {
              ftp,
              lthr,
              maxHr,
              thresholdPace: Number(sportSettings?.thresholdPace || 0)
            },
            fallbackOrder: targetPolicy.fallbackOrder as Array<
              'power' | 'heartRate' | 'pace' | 'rpe'
            >,
            workoutType: workout.type || ''
          })
          if (!step.durationSeconds && stepDuration > 0 && !structure.exercises) {
            step.durationSeconds = stepDuration
          }
          stepDistance =
            stepDistance ||
            estimateStepDistanceMeters(step, {
              refs: {
                ftp,
                lthr,
                maxHr,
                thresholdPace: Number(sportSettings?.thresholdPace || 0)
              },
              fallbackOrder: targetPolicy.fallbackOrder as Array<
                'power' | 'heartRate' | 'pace' | 'rpe'
              >,
              workoutType: workout.type || ''
            })

          const intensity = selectStepIntensity(
            step,
            {
              ftp,
              lthr,
              maxHr,
              thresholdPace,
              hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
              powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
              paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
            },
            targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>
          )
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

    const computedTotals = totals || normalizeAndCalculate(structure.steps || [])
    if (workout.type === 'Ride' || workout.type === 'VirtualRide') {
      enforceCyclingCadenceVariation(structure)
    }
    const totalDistance = computedTotals.distance
    let totalDuration = computedTotals.duration
    let totalTSS = computedTotals.tss

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

    const settingsSnapshot = buildPlannedWorkoutSettingsSnapshot(
      sportSettings,
      { ftp, lthr, maxHr },
      targetPolicy,
      targetFormatPolicy
    )
    const generationContext = buildPlannedWorkoutGenerationContext({
      operation: 'generate',
      generatorMode,
      workout,
      targetPolicy,
      targetFormatPolicy,
      loadPreference,
      timezone,
      model: actualModelUsed as any,
      recentWorkoutsCount: recentWorkouts.length,
      goal,
      phase,
      focus,
      persona
    })

    const updateData: any = {
      ...buildStructureEditFields(structure, 'AI')
    }
    if (totalDistance > 0) updateData.distanceMeters = totalDistance
    if (Number(workout.durationSec) > 0) updateData.durationSec = workout.durationSec
    else if (totalDuration > 0) updateData.durationSec = totalDuration
    if (totalTSS > 0) updateData.tss = Math.round(totalTSS)
    updateData.lastGenerationSettingsSnapshot = settingsSnapshot
    updateData.lastGenerationContext = generationContext
    if (!(workout as any).createdFromSettingsSnapshot) {
      updateData.createdFromSettingsSnapshot = settingsSnapshot
    }

    if (totalTSS > 0 && totalDuration > 0) {
      const calculatedIntensity = Math.sqrt((36 * totalTSS) / totalDuration)
      if (!isNaN(calculatedIntensity) && calculatedIntensity > 0) {
        updateData.workIntensity = parseFloat(calculatedIntensity.toFixed(2))
      }
    }

    if (entityType === 'PlannedWorkout') {
      const updatedWorkout = await (prisma as any).plannedWorkout.update({
        where: { id: entityId },
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

      const isLocal =
        updatedWorkout.syncStatus === 'LOCAL_ONLY' ||
        updatedWorkout.externalId.startsWith('ai_gen_') ||
        updatedWorkout.externalId.startsWith('ai-gen-') ||
        updatedWorkout.externalId.startsWith('adhoc-')

      if (!isLocal) {
        logger.log('Syncing updated structure to Intervals.icu', { plannedWorkoutId: entityId })
        const workoutData = {
          title: updatedWorkout.title,
          description: updatedWorkout.description || '',
          type: updatedWorkout.type || '',
          steps: structure.steps || [],
          exercises: structure.exercises,
          messages: [],
          ftp: workout.user.ftp || 250,
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
          const syncedWorkout = await (prisma as any).plannedWorkout.update({
            where: { id: entityId },
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
        } else {
          const failedWorkout = await (prisma as any).plannedWorkout.update({
            where: { id: entityId },
            data: { syncError: syncResult.error || 'Failed to sync structured intervals' }
          })
          await publishActivityEvent(failedWorkout.userId, {
            scope: 'calendar',
            entityType: 'planned_workout',
            entityId: failedWorkout.id,
            reason: 'updated'
          })
        }
      }
    } else {
      // WorkoutTemplate - Strictly filter fields
      const templateData = {
        structuredWorkout: structure as any,
        durationSec: totalDuration > 0 ? totalDuration : updateData.durationSec,
        tss: updateData.tss,
        workIntensity: updateData.workIntensity
      }

      const updatedTemplate = await (prisma as any).workoutTemplate.update({
        where: { id: entityId },
        data: templateData
      })
      logStage('template-updated', {
        updatedDurationSec: updatedTemplate.durationSec,
        updatedTss: updatedTemplate.tss,
        updatedIntensity: updatedTemplate.workIntensity
      })
    }

    logStage('completed')
    return { success: true, entityId, entityType }
  }
})
