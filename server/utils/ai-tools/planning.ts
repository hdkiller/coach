import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { generateStructuredWorkoutTask } from '../../../trigger/generate-structured-workout'
import { adjustStructuredWorkoutTask } from '../../../trigger/adjust-structured-workout'
import {
  syncPlannedWorkoutToIntervals,
  autoUploadPlannedWorkoutToIntervalsIfEnabled
} from '../../utils/intervals-sync'
import { WorkoutConverter } from '../../utils/workout-converter'
import {
  cleanIntervalsDescription,
  createIntervalsPlannedWorkout,
  updateIntervalsPlannedWorkout,
  isIntervalsEventId
} from '../../utils/intervals'
import { tags } from '@trigger.dev/sdk/v3'
import { plannedWorkoutRepository } from '../repositories/plannedWorkoutRepository'
import { workoutRepository } from '../repositories/workoutRepository'
import { sportSettingsRepository } from '../repositories/sportSettingsRepository'
import { plannedWorkoutPublishRepository } from '../repositories/plannedWorkoutPublishRepository'
import { trainingPlanRepository } from '../repositories/trainingPlanRepository'
import { trainingWeekRepository } from '../repositories/trainingWeekRepository'
import { metabolicService } from '../services/metabolicService'
import type { AiSettings } from '../ai-user-settings'
import {
  getUserLocalDate,
  formatUserDate,
  formatDateUTC,
  getStartOfLocalDateUTC,
  getEndOfLocalDateUTC,
  parseCalendarDate,
  buildInvalidCalendarDateResult
} from '../../utils/date'
import { checkQuota } from '../../utils/quotas/engine'
import {
  resolveWorkoutTargeting,
  applyTargetFormatPolicyToStep,
  applyStepIntentGuard
} from '../../../trigger/utils/workout-targeting'

const STEP_INTENT_VALUES = [
  'warmup',
  'recovery',
  'easy',
  'endurance',
  'tempo',
  'threshold',
  'vo2',
  'anaerobic',
  'sprint',
  'cooldown',
  'drills',
  'strides'
] as const

const PRIMARY_TARGET_VALUES = ['power', 'heartRate', 'pace', 'rpe'] as const

const structuredMessageSchema = z.union([
  z.string(),
  z.object({
    timestamp: z.number().int().nonnegative().optional(),
    text: z.string(),
    duration: z.number().int().positive().optional()
  })
])

const structuredStepSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      type: z.enum(['Warmup', 'Active', 'Rest', 'Cooldown']).optional(),
      intent: z.enum(STEP_INTENT_VALUES).optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      durationSeconds: z.number().int().positive().optional(),
      duration: z.number().int().positive().optional(),
      distance: z.number().positive().optional(),
      reps: z.number().int().positive().optional(),
      repeat: z.number().int().positive().optional(),
      intervals: z.number().int().positive().optional(),
      primaryTarget: z.enum(PRIMARY_TARGET_VALUES).optional(),
      power: z.record(z.string(), z.unknown()).optional(),
      heartRate: z.record(z.string(), z.unknown()).optional(),
      pace: z.record(z.string(), z.unknown()).optional(),
      rpe: z.number().optional(),
      cadence: z.number().optional(),
      cadenceRange: z.record(z.string(), z.unknown()).optional(),
      steps: z.array(structuredStepSchema).optional()
    })
    .passthrough()
)

const structuredWorkoutSchema = z
  .object({
    description: z.string().optional(),
    coachInstructions: z.string().optional(),
    messages: z.array(structuredMessageSchema).optional(),
    steps: z.array(structuredStepSchema).optional(),
    exercises: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .passthrough()
  .refine(
    (value) =>
      value.description !== undefined ||
      value.coachInstructions !== undefined ||
      value.messages !== undefined ||
      value.steps !== undefined ||
      value.exercises !== undefined,
    {
      message:
        'structured_workout must include at least one of: description, coachInstructions, messages, steps, exercises'
    }
  )

const toPositiveInt = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined
  const raw =
    typeof value === 'string'
      ? value.trim().length > 0
        ? Number(value.trim())
        : NaN
      : Number(value)
  if (!Number.isFinite(raw)) return undefined
  const int = Math.trunc(raw)
  return int > 0 ? int : undefined
}

const normalizeStructuredWorkoutRepetition = (structuredWorkout: any) => {
  const normalized = JSON.parse(JSON.stringify(structuredWorkout || {}))

  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry))
      return
    }

    const reps =
      toPositiveInt((node as any).reps) ??
      toPositiveInt((node as any).repeat) ??
      toPositiveInt((node as any).intervals)
    if (reps !== undefined) {
      ;(node as any).reps = reps
    }

    if ('repeat' in node) {
      delete (node as any).repeat
    }

    Object.values(node).forEach((value) => visit(value))
  }

  visit(normalized)
  return normalized
}

const hasMetricTarget = (step: any, metric: 'power' | 'heartRate' | 'pace' | 'rpe') => {
  if (metric === 'rpe') return typeof step?.rpe === 'number'
  const target = step?.[metric]
  return Boolean(target && (typeof target.value === 'number' || target.range))
}

const normalizePrimaryTarget = (
  step: any,
  fallbackOrder: Array<'power' | 'heartRate' | 'pace' | 'rpe'>
) => {
  const current = String(step?.primaryTarget || '')
  if (PRIMARY_TARGET_VALUES.includes(current as any)) {
    return current as 'power' | 'heartRate' | 'pace' | 'rpe'
  }
  for (const metric of fallbackOrder) {
    if (hasMetricTarget(step, metric)) return metric
  }
  return undefined
}

const getTargetMidpoint = (target: any): number | null => {
  if (!target || typeof target !== 'object') return null
  if (typeof target.value === 'number') return target.value
  if (
    target.range &&
    typeof target.range.start === 'number' &&
    typeof target.range.end === 'number'
  ) {
    return (target.range.start + target.range.end) / 2
  }
  return null
}

const toIntensityFactorFromTarget = (
  target: any,
  kind: 'heartRate' | 'power' | 'pace',
  refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
): number | null => {
  const value = getTargetMidpoint(target)
  if (value === null || !Number.isFinite(value)) return null
  const units = String(target?.units || '')
    .trim()
    .toLowerCase()
  const clamp = (n: number) => Math.max(0.3, Math.min(1.8, n))

  if (kind === 'heartRate') {
    if (units === 'bpm') {
      if (refs.lthr > 0) return clamp(value / refs.lthr)
      if (refs.maxHr > 0) return clamp(value / refs.maxHr)
      return clamp(value > 2 ? value / 100 : value)
    }
    if (units.includes('zone')) return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
    return clamp(value > 2 ? value / 100 : value)
  }

  if (kind === 'power') {
    if (units === 'w' || units === 'watts') {
      if (refs.ftp > 0) return clamp(value / refs.ftp)
      return clamp(value > 3 ? value / 250 : value)
    }
    if (units === 'power_zone' || units.includes('zone') || units.startsWith('z')) {
      return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
    }
    return clamp(value > 3 ? value / 100 : value)
  }

  if (units.includes('/')) {
    if (refs.thresholdPace > 0) {
      const secondsPerKm = value * 60
      const metersPerSecond = secondsPerKm > 0 ? 1000 / secondsPerKm : 0
      if (metersPerSecond > 0) return clamp(metersPerSecond / refs.thresholdPace)
    }
    return null
  }
  if (units === 'm/s') {
    if (refs.thresholdPace > 0) return clamp(value / refs.thresholdPace)
    return null
  }
  if (units.includes('zone')) return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
  if (refs.thresholdPace > 0 && value > 3) return clamp(value / refs.thresholdPace)
  return clamp(value > 2 ? value / 100 : value)
}

const normalizeStructuredWorkoutForPersistence = (
  structuredWorkout: any,
  context: {
    refs: {
      ftp: number
      lthr: number
      maxHr: number
      thresholdPace: number
      hrZones: any[]
      powerZones: any[]
      paceZones: any[]
    }
    fallbackOrder: Array<'power' | 'heartRate' | 'pace' | 'rpe'>
    targetFormatPolicy: any
  }
) => {
  const normalized = normalizeStructuredWorkoutRepetition(structuredWorkout)
  const visitStep = (step: any) => {
    if (!step || typeof step !== 'object') return
    if (step.durationSeconds === undefined && step.duration !== undefined) {
      const duration = toPositiveInt(step.duration)
      if (duration) step.durationSeconds = duration
    }

    const primaryTarget = normalizePrimaryTarget(step, context.fallbackOrder)
    if (primaryTarget) step.primaryTarget = primaryTarget

    applyTargetFormatPolicyToStep(step, context.targetFormatPolicy, {
      ftp: context.refs.ftp,
      lthr: context.refs.lthr,
      maxHr: context.refs.maxHr,
      thresholdPace: context.refs.thresholdPace,
      hrZones: context.refs.hrZones,
      powerZones: context.refs.powerZones,
      paceZones: context.refs.paceZones
    })
    applyStepIntentGuard(step, {
      ftp: context.refs.ftp,
      lthr: context.refs.lthr,
      thresholdPace: context.refs.thresholdPace
    })

    if (Array.isArray(step.steps)) {
      step.steps.forEach((child: any) => visitStep(child))
    }
  }

  if (Array.isArray(normalized?.steps)) {
    normalized.steps.forEach((step: any) => visitStep(step))
  }
  return normalized
}

const computeStructuredWorkoutMetrics = (
  structuredWorkout: any,
  refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
) => {
  const walk = (steps: any[]): { duration: number; tss: number } => {
    let duration = 0
    let tss = 0
    for (const step of steps || []) {
      const reps = toPositiveInt(step?.reps) || 1
      let stepDuration = 0
      let stepTss = 0

      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        const nested = walk(step.steps)
        stepDuration = nested.duration
        stepTss = nested.tss
      } else {
        stepDuration = Number(step?.durationSeconds || step?.duration || 0)
        if (stepDuration <= 0 && Number(step?.distance) > 0) {
          stepDuration = Math.round(Number(step.distance) * 3)
        } else if (stepDuration <= 0 && step?.type !== 'Rest') {
          stepDuration = 60
        }

        let intensity = 0.5
        const hr = toIntensityFactorFromTarget(step?.heartRate, 'heartRate', refs)
        const power = toIntensityFactorFromTarget(step?.power, 'power', refs)
        const pace = toIntensityFactorFromTarget(step?.pace, 'pace', refs)
        if (hr !== null) intensity = hr
        else if (power !== null) intensity = power
        else if (pace !== null) intensity = pace
        else if (typeof step?.rpe === 'number')
          intensity = Math.max(0.3, Math.min(1.3, step.rpe / 10))
        else if (step?.type === 'Rest' || step?.type === 'Cooldown') intensity = 0.4
        else if (step?.type === 'Warmup') intensity = 0.5
        else intensity = 0.75

        if (stepDuration > 0) {
          stepTss = ((stepDuration * intensity * intensity) / 3600) * 100
        }
      }

      duration += stepDuration * reps
      tss += stepTss * reps
    }
    return { duration, tss }
  }

  const totals = walk(structuredWorkout?.steps || [])
  const durationSec = Math.round(totals.duration)
  const tss = Math.round(totals.tss)
  const workIntensity =
    durationSec > 0 && tss > 0 ? Number(Math.sqrt((36 * tss) / durationSec).toFixed(2)) : null
  return { durationSec, tss, workIntensity }
}

const getPendingSyncStatus = (syncStatus: string | null | undefined) => {
  return syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING'
}

const parsePlanningDateInput = (field: string, value: string, input: Record<string, unknown>) => {
  const parsed = parseCalendarDate(value)
  if (!parsed) {
    return { error: buildInvalidCalendarDateResult(field, value, input) }
  }
  return { date: parsed }
}

const patchOperationSchema = z.object({
  op: z.enum(['add', 'replace', 'remove']),
  path: z
    .string()
    .describe(
      'Dot path inside structured workout (e.g. "steps.0.name", "messages.1", "coachInstructions")'
    ),
  value: z.unknown().optional()
})

const parsePatchPath = (rawPath: string): string[] => {
  const normalized = rawPath
    .trim()
    .replace(/^structured_workout\./, '')
    .replace(/^structuredWorkout\./, '')
    .replace(/^\./, '')

  if (!normalized) {
    throw new Error('Patch path cannot be empty')
  }

  return normalized.split('.').filter(Boolean)
}

const toArrayIndex = (segment: string, length: number, allowEnd = false): number => {
  if (segment === '-' && allowEnd) return length
  const index = Number(segment)
  if (!Number.isInteger(index)) {
    throw new Error(`Invalid array index "${segment}"`)
  }
  if (index < 0) {
    throw new Error(`Array index out of bounds: ${index}`)
  }
  return index
}

const resolvePatchParent = (root: any, pathSegments: string[]) => {
  let parent = root

  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i]!
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
      throw new Error(`Unsafe patch path segment "${segment}"`)
    }

    if (Array.isArray(parent)) {
      const index = toArrayIndex(segment, parent.length)
      if (index >= parent.length) {
        throw new Error(`Array path segment out of bounds at "${segment}"`)
      }
      parent = parent[index]
      continue
    }

    if (parent === null || typeof parent !== 'object') {
      throw new Error(`Path segment "${segment}" does not resolve to an object or array`)
    }

    if (!(segment in parent)) {
      throw new Error(`Path segment "${segment}" does not exist`)
    }
    parent = parent[segment]
  }

  return { parent, key: pathSegments[pathSegments.length - 1]! }
}

const applyStructurePatchOperation = (structuredWorkout: any, operation: any) => {
  const pathSegments = parsePatchPath(operation.path)
  const { parent, key } = resolvePatchParent(structuredWorkout, pathSegments)

  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`Unsafe patch key "${key}"`)
  }

  if (operation.op === 'add') {
    if (operation.value === undefined) {
      throw new Error(`Patch operation "add" requires a value`)
    }

    if (Array.isArray(parent)) {
      const index = toArrayIndex(key, parent.length, true)
      if (index > parent.length) {
        throw new Error(`Array index out of bounds: ${index}`)
      }
      parent.splice(index, 0, operation.value)
      return
    }

    if (parent === null || typeof parent !== 'object') {
      throw new Error('Cannot add value to non-object parent')
    }

    parent[key] = operation.value
    return
  }

  if (operation.op === 'replace') {
    if (operation.value === undefined) {
      throw new Error(`Patch operation "replace" requires a value`)
    }

    if (Array.isArray(parent)) {
      const index = toArrayIndex(key, parent.length)
      if (index >= parent.length) {
        throw new Error(`Array index out of bounds: ${index}`)
      }
      parent[index] = operation.value
      return
    }

    if (parent === null || typeof parent !== 'object') {
      throw new Error('Cannot replace value on non-object parent')
    }

    if (!(key in parent)) {
      throw new Error(`Path "${operation.path}" does not exist for replace`)
    }
    parent[key] = operation.value
    return
  }

  if (operation.op === 'remove') {
    if (Array.isArray(parent)) {
      const index = toArrayIndex(key, parent.length)
      if (index >= parent.length) {
        throw new Error(`Array index out of bounds: ${index}`)
      }
      parent.splice(index, 1)
      return
    }

    if (parent === null || typeof parent !== 'object') {
      throw new Error('Cannot remove value from non-object parent')
    }

    if (!(key in parent)) {
      throw new Error(`Path "${operation.path}" does not exist for remove`)
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete parent[key]
  }
}

const trainingWeekLookupSchema = z
  .object({
    week_id: z.string().optional().describe('TrainingWeek ID to update'),
    workout_id: z
      .string()
      .optional()
      .describe('Planned workout ID whose linked training week should be updated')
  })
  .refine((value) => value.week_id || value.workout_id, {
    message: 'Provide either week_id or workout_id'
  })

export const planningTools = (userId: string, timezone: string, aiSettings: AiSettings) => ({
  get_planned_workouts: tool({
    description: 'Get a list of planned workouts for a specific date range.',
    inputSchema: z.object({
      start_date: z.string().optional().describe('YYYY-MM-DD (defaults to today)'),
      end_date: z.string().optional().describe('YYYY-MM-DD'),
      limit: z.number().optional().default(20)
    }),
    execute: async ({ start_date, end_date, limit }) => {
      const start = start_date
        ? getStartOfLocalDateUTC(timezone, start_date)
        : getUserLocalDate(timezone)
      const end = end_date ? getEndOfLocalDateUTC(timezone, end_date) : undefined

      const workouts = await plannedWorkoutRepository.list(userId, {
        startDate: start,
        endDate: end,
        limit
      })

      return {
        count: workouts.length,
        workouts: workouts.map((w) => ({
          id: w.id,
          date: formatDateUTC(w.date),
          time: w.startTime,
          title: w.title,
          type: w.type,
          duration: w.durationSec ? Math.round(w.durationSec / 60) + ' min' : undefined,
          tss: w.tss,
          description: w.description
        }))
      }
    }
  }),

  search_planned_workouts: tool({
    description: 'Search for planned workouts by title, description or type.',
    inputSchema: z.object({
      query: z.string().describe('Search term for title or description'),
      type: z.string().optional(),
      start_date: z.string().optional().describe('YYYY-MM-DD'),
      end_date: z.string().optional().describe('YYYY-MM-DD')
    }),
    execute: async ({ query, type, start_date, end_date }) => {
      const start = start_date ? new Date(`${start_date}T00:00:00Z`) : undefined
      const end = end_date ? new Date(`${end_date}T00:00:00Z`) : undefined

      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }

      if (type) {
        where.type = { contains: type, mode: 'insensitive' }
      }

      const workouts = await plannedWorkoutRepository.list(userId, {
        startDate: start,
        endDate: end,
        where,
        limit: 10
      })

      return workouts.map((w) => ({
        id: w.id,
        date: formatDateUTC(w.date),
        time: w.startTime,
        title: w.title,
        type: w.type,
        duration: w.durationSec ? Math.round(w.durationSec / 60) + ' min' : undefined,
        description: w.description
      }))
    }
  }),

  get_current_plan: tool({
    description:
      'Get the current active training plan with all details including daily workouts and weekly summary.',
    inputSchema: z.object({}),
    execute: async () => {
      // Find start of current week relative to user
      const today = getUserLocalDate(timezone)
      const currentWeekStart = new Date(today)

      // getUTCDay() since it's a UTC-aligned date
      const day = currentWeekStart.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day // adjust to Monday
      currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + diff)

      // Get active or most recent plan
      const plan = await prisma.weeklyTrainingPlan.findFirst({
        where: {
          userId,
          weekStartDate: {
            lte: currentWeekStart
          }
        },
        orderBy: [{ status: 'asc' }, { weekStartDate: 'desc' }]
      })

      if (!plan) {
        return {
          message: 'No training plan found',
          suggestion: 'Ask me to plan your week'
        }
      }

      const planJson = plan.planJson as any

      return {
        plan: {
          id: plan.id,
          week_start: formatDateUTC(plan.weekStartDate),
          week_end: formatDateUTC(plan.weekEndDate),
          days_planned: plan.daysPlanned,
          status: plan.status,
          total_tss: plan.totalTSS,
          workout_count: plan.workoutCount,
          summary: planJson?.weekSummary,
          days: planJson?.days || [],
          generated_at: formatUserDate(plan.createdAt, timezone),
          model_version: plan.modelVersion
        }
      }
    }
  }),

  update_training_week: tool({
    description:
      'Update a training week target or focus. Use this when the user wants to change weekly TSS, volume, recovery status, or focus for an existing plan week.',
    inputSchema: trainingWeekLookupSchema.extend({
      tss_target: z.number().int().min(0).optional(),
      volume_target_minutes: z.number().int().min(0).optional(),
      focus_key: z.string().optional(),
      focus_label: z.string().optional(),
      is_recovery: z.boolean().optional()
    }),
    needsApproval: async () => true,
    execute: async ({
      week_id,
      workout_id,
      tss_target,
      volume_target_minutes,
      focus_key,
      focus_label,
      is_recovery
    }) => {
      const updateData: Record<string, unknown> = {}

      if (tss_target !== undefined) updateData.tssTarget = tss_target
      if (volume_target_minutes !== undefined)
        updateData.volumeTargetMinutes = volume_target_minutes
      if (focus_key !== undefined) updateData.focusKey = focus_key
      if (focus_label !== undefined) updateData.focusLabel = focus_label
      if (is_recovery !== undefined) updateData.isRecovery = is_recovery

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error:
            'No training week fields provided. Update at least one of tss_target, volume_target_minutes, focus_key, focus_label, or is_recovery.'
        }
      }

      let targetWeekId = week_id

      if (!targetWeekId && workout_id) {
        const workout = (await plannedWorkoutRepository.getById(workout_id, userId, {
          select: {
            id: true,
            title: true,
            trainingWeekId: true
          }
        })) as any

        if (!workout) {
          return { success: false, error: 'Planned workout not found.' }
        }

        if (!workout.trainingWeekId) {
          return {
            success: false,
            error: 'Planned workout is not linked to a training week.'
          }
        }

        targetWeekId = workout.trainingWeekId
      }

      const week = (await trainingWeekRepository.getById(targetWeekId!, {
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
      })) as any

      if (!week || week.block?.plan?.userId !== userId) {
        return { success: false, error: 'Training week not found.' }
      }

      const updatedWeek = await trainingWeekRepository.update(targetWeekId!, updateData as any)

      return {
        success: true,
        week: {
          id: updatedWeek.id,
          week_number: updatedWeek.weekNumber,
          start_date: formatDateUTC(updatedWeek.startDate),
          end_date: formatDateUTC(updatedWeek.endDate),
          tss_target: updatedWeek.tssTarget,
          volume_target_minutes: updatedWeek.volumeTargetMinutes,
          focus_key: updatedWeek.focusKey,
          focus_label: updatedWeek.focusLabel,
          is_recovery: updatedWeek.isRecovery,
          plan_id: week.block.plan.id,
          plan_status: week.block.plan.status,
          plan_name: week.block.plan.name || undefined
        },
        message: 'Training week updated successfully.'
      }
    }
  }),

  get_planned_workout_details: tool({
    description: 'Get detailed information about a specific planned workout.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the planned workout')
    }),
    execute: async ({ workout_id }) => {
      const workout = await plannedWorkoutRepository.getById(workout_id, userId, {
        include: {
          trainingWeek: {
            include: {
              block: {
                include: {
                  plan: true
                }
              }
            }
          }
        }
      })

      if (!workout) return { error: 'Planned workout not found' }

      return {
        ...workout,
        date: formatDateUTC(workout.date)
      }
    }
  }),

  get_planned_workout_structure: tool({
    description:
      'Get only the structured workout data (steps/exercises/instructions) for a planned workout.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the planned workout')
    }),
    execute: async ({ workout_id }) => {
      const workout = (await plannedWorkoutRepository.getById(workout_id, userId, {
        select: {
          id: true,
          title: true,
          date: true,
          type: true,
          durationSec: true,
          structuredWorkout: true,
          updatedAt: true
        }
      })) as any

      if (!workout) return { error: 'Planned workout not found' }

      return {
        success: true,
        workout_id: workout.id,
        title: workout.title,
        date: formatDateUTC(workout.date),
        type: workout.type,
        duration_minutes: workout.durationSec ? Math.round(workout.durationSec / 60) : undefined,
        has_structure: Boolean(workout.structuredWorkout),
        structured_workout: workout.structuredWorkout || null,
        updated_at: workout.updatedAt
      }
    }
  }),

  set_planned_workout_structure: tool({
    description:
      'Directly set a planned workout structure (steps/exercises/instructions) without AI regeneration.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the planned workout'),
      structured_workout: structuredWorkoutSchema
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ workout_id, structured_workout }) => {
      const existing = (await plannedWorkoutRepository.getById(workout_id, userId, {
        select: {
          id: true,
          syncStatus: true,
          type: true,
          user: { select: { ftp: true, lthr: true, maxHr: true } }
        }
      })) as any

      if (!existing) return { error: 'Planned workout not found' }
      const sportSettings = await sportSettingsRepository.getForActivityType(
        userId,
        existing.type || ''
      )
      const { targetPolicy, targetFormatPolicy } = resolveWorkoutTargeting(sportSettings)
      const refs = {
        ftp: Number(existing.user?.ftp || sportSettings?.ftp || 250),
        lthr: Number(sportSettings?.lthr || existing.user?.lthr || 0),
        maxHr: Number(sportSettings?.maxHr || existing.user?.maxHr || 0),
        thresholdPace: Number(sportSettings?.thresholdPace || 0),
        hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
        powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
        paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
      }
      const normalized = normalizeStructuredWorkoutForPersistence(structured_workout, {
        refs,
        fallbackOrder: targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>,
        targetFormatPolicy
      })
      const metrics = computeStructuredWorkoutMetrics(normalized, refs)

      const updated = (await plannedWorkoutRepository.update(workout_id, userId, {
        structuredWorkout: normalized as any,
        durationSec: metrics.durationSec > 0 ? metrics.durationSec : undefined,
        tss: metrics.tss > 0 ? metrics.tss : undefined,
        workIntensity: metrics.workIntensity ?? undefined,
        modifiedLocally: true,
        syncStatus: existing.syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING',
        syncError: null
      })) as any

      return {
        success: true,
        workout_id: updated.id,
        status: existing.syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'QUEUED_FOR_SYNC',
        message:
          'Planned workout structure updated. Publish to Intervals.icu when you are ready to push changes.',
        structured_workout: updated.structuredWorkout
      }
    }
  }),

  patch_planned_workout_structure: tool({
    description:
      'Patch specific parts of a planned workout structure using add/replace/remove operations.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the planned workout'),
      operations: z.array(patchOperationSchema).min(1)
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ workout_id, operations }) => {
      const existing = (await plannedWorkoutRepository.getById(workout_id, userId, {
        select: {
          id: true,
          syncStatus: true,
          structuredWorkout: true,
          type: true,
          user: { select: { ftp: true, lthr: true, maxHr: true } }
        }
      })) as any

      if (!existing) return { error: 'Planned workout not found' }
      if (!existing.structuredWorkout || typeof existing.structuredWorkout !== 'object') {
        return {
          success: false,
          error: 'No structured workout exists yet. Use generate or set first.'
        }
      }

      try {
        const patched = JSON.parse(JSON.stringify(existing.structuredWorkout))
        for (const operation of operations) {
          applyStructurePatchOperation(patched, operation)
        }

        const sportSettings = await sportSettingsRepository.getForActivityType(
          userId,
          existing.type || ''
        )
        const { targetPolicy, targetFormatPolicy } = resolveWorkoutTargeting(sportSettings)
        const refs = {
          ftp: Number(existing.user?.ftp || sportSettings?.ftp || 250),
          lthr: Number(sportSettings?.lthr || existing.user?.lthr || 0),
          maxHr: Number(sportSettings?.maxHr || existing.user?.maxHr || 0),
          thresholdPace: Number(sportSettings?.thresholdPace || 0),
          hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
          powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
          paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
        }
        const normalized = normalizeStructuredWorkoutForPersistence(patched, {
          refs,
          fallbackOrder: targetPolicy.fallbackOrder as Array<
            'power' | 'heartRate' | 'pace' | 'rpe'
          >,
          targetFormatPolicy
        })
        const metrics = computeStructuredWorkoutMetrics(normalized, refs)

        const updated = (await plannedWorkoutRepository.update(workout_id, userId, {
          structuredWorkout: normalized as any,
          durationSec: metrics.durationSec > 0 ? metrics.durationSec : undefined,
          tss: metrics.tss > 0 ? metrics.tss : undefined,
          workIntensity: metrics.workIntensity ?? undefined,
          modifiedLocally: true,
          syncStatus: existing.syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING',
          syncError: null
        })) as any

        return {
          success: true,
          workout_id: updated.id,
          status: existing.syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'QUEUED_FOR_SYNC',
          applied_operations: operations.length,
          structured_workout: updated.structuredWorkout
        }
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || 'Failed to patch structured workout.'
        }
      }
    }
  }),

  create_planned_workout: tool({
    description:
      'Create a future planned workout in the calendar. If the user gives a relative date like "next Monday" or "tomorrow", first call `resolve_temporal_reference` and use its `resolved_date` here.',
    inputSchema: z.object({
      date: z.string().describe('Date (YYYY-MM-DD)'),
      time_of_day: z.string().optional().describe('Time in HH:mm format'),
      title: z.string(),
      description: z.string().optional(),
      type: z.string().describe('Sport type (Ride, Run, Swim, etc)'),
      duration_minutes: z.number().describe('Planned duration in minutes'),
      tss: z.number().optional().describe('Planned TSS'),
      intensity: z
        .string()
        .optional()
        .describe('Intensity description (e.g. "Zone 2", "Intervals")'),
      generate_structure: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Set to false to skip structured interval generation (e.g. for rest days, holidays, or simple unstructured events)'
        )
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
      // 0. Quota Check
      if (args.generate_structure !== false) {
        await checkQuota(userId, 'generate_structured_workout')
      }

      const parsedDate = parsePlanningDateInput('date', args.date, args)
      if ('error' in parsedDate) return parsedDate.error

      // Create a PlannedWorkout, not a Workout
      const workout = await plannedWorkoutRepository.create({
        userId,
        date: parsedDate.date,
        startTime: args.time_of_day,
        title: args.title,
        description: args.description || args.intensity,
        type: args.type,
        durationSec: args.duration_minutes * 60,
        tss: args.tss,
        externalId: `ai-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        syncStatus: 'LOCAL_ONLY',
        completionStatus: 'PENDING'
      })

      await autoUploadPlannedWorkoutToIntervalsIfEnabled({
        id: workout.id,
        userId,
        externalId: workout.externalId,
        date: workout.date,
        startTime: workout.startTime,
        title: workout.title,
        description: workout.description,
        type: workout.type,
        durationSec: workout.durationSec,
        tss: workout.tss,
        managedBy: workout.managedBy
      })

      // Trigger structured workout generation
      let runId: string | undefined
      if (args.generate_structure !== false) {
        try {
          const handle = await generateStructuredWorkoutTask.trigger(
            {
              plannedWorkoutId: workout.id // Pass plannedWorkoutId
            },
            {
              tags: [`user:${userId}`, `planned-workout:${workout.id}`],
              concurrencyKey: userId
            }
          )
          runId = handle.id
        } catch (e) {
          console.error('Failed to trigger structured workout generation:', e)
        }
      }

      return {
        success: true,
        workout_id: workout.id,
        ...(runId ? { run_id: runId } : {}),
        message:
          args.generate_structure !== false
            ? 'Planned workout created and structured generation started.'
            : 'Planned workout created.'
      }
    }
  }),

  update_planned_workout: tool({
    description:
      'Update an existing planned workout (rename, reschedule, etc). If updating the date from a relative phrase, first call `resolve_temporal_reference` and use its `resolved_date`.',
    inputSchema: z.object({
      workout_id: z.string(),
      date: z.string().optional(),
      time_of_day: z.string().optional().describe('Time in HH:mm format'),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      duration_minutes: z.number().optional(),
      tss: z.number().optional(),
      generate_structure: z
        .boolean()
        .optional()
        .describe(
          'Set to false to skip structured interval regeneration (e.g. for rest days, holidays, or minor updates)'
        )
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
      // 0. Quota Check
      if (args.generate_structure !== false) {
        await checkQuota(userId, 'generate_structured_workout')
      }

      const existing = await plannedWorkoutRepository.getById(args.workout_id, userId, {
        select: { id: true, syncStatus: true }
      })
      if (!existing) return { success: false, error: 'Planned workout not found' }

      const nextSyncStatus = getPendingSyncStatus((existing as any).syncStatus)
      const data: any = {}
      if (args.title !== undefined) data.title = args.title
      if (args.description !== undefined) data.description = args.description
      if (args.type !== undefined) data.type = args.type
      if (args.time_of_day !== undefined) data.startTime = args.time_of_day
      if (args.duration_minutes !== undefined) {
        data.durationSec = args.duration_minutes * 60
      }
      if (args.tss !== undefined) data.tss = args.tss
      if (args.date) {
        const parsedDate = parsePlanningDateInput('date', args.date, args)
        if ('error' in parsedDate) return parsedDate.error
        data.date = parsedDate.date
      }
      data.modifiedLocally = true
      data.syncStatus = nextSyncStatus
      data.syncError = null

      const workout = await plannedWorkoutRepository.update(args.workout_id, userId, data)

      // Trigger regeneration of structured intervals
      let runId: string | undefined
      if (args.generate_structure !== false) {
        try {
          const handle = await generateStructuredWorkoutTask.trigger(
            {
              plannedWorkoutId: workout.id
            },
            {
              tags: [`user:${userId}`, `planned-workout:${workout.id}`],
              concurrencyKey: userId
            }
          )
          runId = handle.id
        } catch (e) {
          console.error('Failed to trigger structured workout regeneration:', e)
        }
      }

      return {
        success: true,
        workout_id: workout.id,
        ...(runId ? { run_id: runId } : {}),
        status: nextSyncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'QUEUED_FOR_SYNC'
      }
    }
  }),

  reschedule_planned_workout: tool({
    description:
      'Reschedule an existing planned workout to a new date/time. Prefer this over delete + create when moving sessions. If the user gives a relative target date like "next Monday" or "tomorrow", first call `resolve_temporal_reference` and use its `resolved_date` as `new_date`.',
    inputSchema: z.object({
      workout_id: z.string().optional().describe('Planned workout ID if known'),
      current_date: z
        .string()
        .optional()
        .describe('Current workout date YYYY-MM-DD (used for lookup when workout_id is unknown)'),
      title_contains: z
        .string()
        .optional()
        .describe('Optional title text used to disambiguate lookup'),
      current_time_of_day: z
        .string()
        .optional()
        .describe('Optional current time HH:mm used to disambiguate lookup'),
      new_date: z.string().describe('Target date YYYY-MM-DD'),
      new_time_of_day: z.string().optional().describe('Target time HH:mm (optional)')
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
      let workoutId = args.workout_id
      const parsedNewDate = parsePlanningDateInput('new_date', args.new_date, args)
      if ('error' in parsedNewDate) return parsedNewDate.error

      if (!workoutId) {
        if (!args.current_date) {
          return {
            success: false,
            error:
              'workout_id is required unless you provide current_date for lookup before rescheduling.'
          }
        }

        const parsedCurrentDate = parsePlanningDateInput('current_date', args.current_date, args)
        if ('error' in parsedCurrentDate) return parsedCurrentDate.error

        const candidates = await plannedWorkoutRepository.list(userId, {
          startDate: getStartOfLocalDateUTC(timezone, args.current_date),
          endDate: getEndOfLocalDateUTC(timezone, args.current_date),
          limit: 50
        })

        const titleQuery = args.title_contains?.trim().toLowerCase()
        const filtered = candidates.filter((candidate) => {
          if (
            titleQuery &&
            !candidate.title.toLowerCase().includes(titleQuery) &&
            !(candidate.description || '').toLowerCase().includes(titleQuery)
          ) {
            return false
          }
          if (args.current_time_of_day && candidate.startTime !== args.current_time_of_day) {
            return false
          }
          return true
        })

        if (filtered.length === 0) {
          return {
            success: false,
            error: 'No matching planned workout found for the provided lookup criteria.'
          }
        }

        if (filtered.length > 1) {
          return {
            success: false,
            error: 'Multiple planned workouts matched. Please provide workout_id.',
            matches: filtered.slice(0, 5).map((w) => ({
              workout_id: w.id,
              date: formatDateUTC(w.date),
              time_of_day: w.startTime,
              title: w.title
            }))
          }
        }

        workoutId = filtered[0]!.id
      }

      const existing = await plannedWorkoutRepository.getById(workoutId, userId, {
        select: { id: true, date: true, startTime: true, title: true, syncStatus: true }
      })
      if (!existing) return { success: false, error: 'Planned workout not found' }

      const nextSyncStatus = getPendingSyncStatus((existing as any).syncStatus)
      const updateData: any = {
        date: parsedNewDate.date,
        modifiedLocally: true,
        syncStatus: nextSyncStatus,
        syncError: null
      }
      if (args.new_time_of_day !== undefined) {
        updateData.startTime = args.new_time_of_day
      }

      const updated = await plannedWorkoutRepository.update(existing.id, userId, updateData)

      return {
        success: true,
        workout_id: updated.id,
        title: existing.title,
        previous_date: formatDateUTC(existing.date),
        previous_time_of_day: existing.startTime,
        new_date: formatDateUTC(updated.date),
        new_time_of_day: updated.startTime,
        status: nextSyncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'QUEUED_FOR_SYNC',
        message: 'Planned workout rescheduled.'
      }
    }
  }),

  adjust_planned_workout: tool({
    description: 'Adjust a planned workout structure using AI instructions.',
    inputSchema: z.object({
      workout_id: z.string(),
      instructions: z
        .string()
        .describe('Instructions for adjustment (e.g. "make it harder", "add intervals")'),
      duration_minutes: z.number().optional(),
      intensity: z.enum(['recovery', 'easy', 'moderate', 'hard', 'very_hard']).optional()
    }),
    execute: async ({ workout_id, instructions, duration_minutes, intensity }) => {
      // 0. Quota Check
      await checkQuota(userId, 'generate_structured_workout')

      // Trigger adjustment task
      try {
        const handle = await adjustStructuredWorkoutTask.trigger(
          {
            plannedWorkoutId: workout_id,
            adjustments: {
              feedback: instructions,
              durationMinutes: duration_minutes,
              intensity: intensity
            }
          },
          {
            tags: [`user:${userId}`, `planned-workout:${workout_id}`],
            concurrencyKey: userId
          }
        )
        return {
          success: true,
          workout_id,
          run_id: handle.id,
          message: 'Workout adjustment started.'
        }
      } catch (e) {
        console.error('Failed to trigger workout adjustment:', e)
        return { success: false, error: 'Failed to start adjustment task.' }
      }
    }
  }),

  generate_planned_workout_structure: tool({
    description: 'Generate or update the structured intervals for a planned workout.',
    inputSchema: z.object({
      workout_id: z.string()
    }),
    execute: async ({ workout_id }) => {
      // 0. Quota Check
      await checkQuota(userId, 'generate_structured_workout')

      try {
        const handle = await generateStructuredWorkoutTask.trigger(
          { plannedWorkoutId: workout_id },
          {
            tags: [`user:${userId}`, `planned-workout:${workout_id}`],
            concurrencyKey: userId
          }
        )
        return {
          success: true,
          workout_id,
          run_id: handle.id,
          message: 'Structure regeneration started.'
        }
      } catch (e) {
        return { success: false, error: 'Failed to trigger regeneration.' }
      }
    }
  }),

  publish_planned_workout: tool({
    description: 'Publish or update a planned workout to Intervals.icu.',
    inputSchema: z.object({
      workout_id: z.string()
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ workout_id }) => {
      // Use repository to find the workout
      const workout = (await plannedWorkoutRepository.getById(workout_id, userId, {
        include: { user: { select: { ftp: true } } }
      })) as any // Cast because of complex include

      if (!workout) return { error: 'Workout not found' }

      // Logic copied from publish endpoint, simplified
      // Ideally this should be in a service but for now we implement directly using utils
      const integration = await prisma.integration.findFirst({
        where: { userId, provider: 'intervals' }
      })

      if (!integration) return { error: 'Intervals.icu integration not found' }

      const provider = 'intervals'
      const existingTarget = await plannedWorkoutPublishRepository.getByProvider(
        workout_id,
        provider
      )
      const existingExternalId =
        existingTarget?.externalId && isIntervalsEventId(existingTarget.externalId)
          ? existingTarget.externalId
          : isIntervalsEventId(workout.externalId)
            ? workout.externalId
            : null
      const isLocal = !existingExternalId

      // Fetch sport settings to check preferences
      const sportSettings = await sportSettingsRepository.getForActivityType(
        userId,
        workout.type || 'Ride'
      )

      let workoutDoc = ''
      if (workout.structuredWorkout) {
        const workoutData = {
          title: workout.title,
          description: workout.description || '',
          type: workout.type || 'Ride',
          steps: (workout.structuredWorkout as any).steps || [],
          exercises: (workout.structuredWorkout as any).exercises,
          messages: (workout.structuredWorkout as any).messages || [],
          ftp: (workout.user as any).ftp || 250,
          sportSettings: sportSettings || undefined,
          generationSettingsSnapshot:
            workout.lastGenerationSettingsSnapshot || workout.createdFromSettingsSnapshot || null
        }
        workoutDoc = WorkoutConverter.toIntervalsICU(workoutData)
      }

      const cleanDescription = cleanIntervalsDescription(workout.description || '')

      try {
        if (isLocal) {
          const intervalsWorkout = await createIntervalsPlannedWorkout(integration, {
            date: workout.date,
            startTime: workout.startTime,
            title: workout.title,
            description: cleanDescription,
            type: workout.type || 'Ride',
            durationSec: workout.durationSec || 3600,
            tss: workout.tss ?? undefined,
            workout_doc: workoutDoc,
            managedBy: workout.managedBy
          })

          await plannedWorkoutRepository.update(workout_id, userId, {
            externalId: String(intervalsWorkout.id),
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date()
          })
          await plannedWorkoutPublishRepository.upsert(workout_id, provider, {
            externalId: String(intervalsWorkout.id),
            status: 'SYNCED',
            error: null,
            lastSyncedAt: new Date()
          })
          return { success: true, message: 'Workout published to Intervals.icu.' }
        } else {
          await updateIntervalsPlannedWorkout(integration, existingExternalId!, {
            date: workout.date,
            startTime: workout.startTime,
            title: workout.title,
            description: cleanDescription,
            type: workout.type || 'Ride',
            durationSec: workout.durationSec || 3600,
            tss: workout.tss ?? undefined,
            workout_doc: workoutDoc,
            managedBy: workout.managedBy
          })

          await plannedWorkoutRepository.update(workout_id, userId, {
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date()
          })
          await plannedWorkoutPublishRepository.upsert(workout_id, provider, {
            externalId: existingExternalId!,
            status: 'SYNCED',
            error: null,
            lastSyncedAt: new Date()
          })
          return { success: true, message: 'Workout updated on Intervals.icu.' }
        }
      } catch (e: any) {
        await plannedWorkoutPublishRepository.upsert(workout_id, provider, {
          status: 'FAILED',
          error: e.message || 'Failed to publish.'
        })
        return { success: false, error: e.message || 'Failed to publish.' }
      }
    }
  }),

  delete_planned_workout: tool({
    description: 'Delete a planned workout from the calendar.',
    inputSchema: z.object({
      workout_id: z.string(),
      reason: z.string().optional()
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ workout_id }) => {
      try {
        const existing = await plannedWorkoutRepository.getById(workout_id, userId, {
          select: { id: true, date: true }
        })
        if (!existing) {
          return { success: false, error: 'Planned workout not found.' }
        }

        await plannedWorkoutRepository.delete(workout_id, userId)

        try {
          await metabolicService.calculateFuelingPlanForDate(userId, existing.date, {
            persist: true
          })
        } catch (recalcError) {
          console.error('[PlanningTools] Failed to regenerate fueling plan after planned delete:', {
            userId,
            workoutId: workout_id,
            date: existing.date,
            error: recalcError
          })
        }

        return { success: true, message: 'Planned workout deleted.' }
      } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete planned workout.' }
      }
    }
  }),

  delete_workout: tool({
    description: 'Delete a workout (planned or completed).',
    inputSchema: z.object({
      workout_id: z.string(),
      reason: z.string().optional()
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
      // Try deleting from both tables or check which one
      // For simplicity, try PlannedWorkout first
      try {
        const existingPlanned = await plannedWorkoutRepository.getById(args.workout_id, userId, {
          select: { id: true, date: true }
        })
        if (!existingPlanned) throw new Error('Planned workout not found')

        await plannedWorkoutRepository.delete(args.workout_id, userId)

        try {
          await metabolicService.calculateFuelingPlanForDate(userId, existingPlanned.date, {
            persist: true
          })
        } catch (recalcError) {
          console.error('[PlanningTools] Failed to regenerate fueling plan after planned delete:', {
            userId,
            workoutId: args.workout_id,
            date: existingPlanned.date,
            error: recalcError
          })
        }

        return { success: true, message: 'Planned workout deleted.' }
      } catch (e) {
        // If failed, try Workout
        try {
          const existingWorkout = await workoutRepository.getById(args.workout_id, userId, {
            select: { id: true, date: true }
          })
          if (!existingWorkout) throw new Error('Workout not found')

          await workoutRepository.delete(args.workout_id, userId)

          try {
            await metabolicService.calculateFuelingPlanForDate(userId, existingWorkout.date, {
              persist: true
            })
          } catch (recalcError) {
            console.error(
              '[PlanningTools] Failed to regenerate fueling plan after completed workout delete:',
              {
                userId,
                workoutId: args.workout_id,
                date: existingWorkout.date,
                error: recalcError
              }
            )
          }

          return { success: true, message: 'Completed workout deleted.' }
        } catch (e2: any) {
          return { success: false, error: e2.message || 'Failed to delete workout.' }
        }
      }
    }
  }),

  modify_training_plan_structure: tool({
    description:
      'Modify the structure of the active training plan (add, remove, or resize training blocks).',
    inputSchema: z.object({
      plan_id: z.string(),
      operations: z.array(
        z.object({
          type: z.enum(['ADD', 'UPDATE', 'DELETE']),
          block_id: z.string().optional().describe('Required for UPDATE and DELETE'),
          name: z.string().optional(),
          block_type: z.enum(['PREP', 'BASE', 'BUILD', 'PEAK', 'RACE', 'TRANSITION']).optional(),
          primary_focus: z.string().optional(),
          duration_weeks: z.number().int().min(1).max(12).optional(),
          order: z.number().int().optional()
        })
      )
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ plan_id, operations }) => {
      // Fetch current plan structure to work with
      const plan = await trainingPlanRepository.getById(plan_id, userId, {
        include: { blocks: { orderBy: { order: 'asc' } } }
      })

      if (!plan) return { success: false, error: 'Plan not found' }

      // Map AI operations to the replan-structure format
      const localBlocks = JSON.parse(JSON.stringify(plan.blocks))

      for (const op of operations) {
        if (op.type === 'DELETE' && op.block_id) {
          const idx = localBlocks.findIndex((b: any) => b.id === op.block_id)
          if (idx !== -1) localBlocks.splice(idx, 1)
        } else if (op.type === 'UPDATE' && op.block_id) {
          const block = localBlocks.find((b: any) => b.id === op.block_id)
          if (block) {
            if (op.name) block.name = op.name
            if (op.block_type) block.type = op.block_type
            if (op.primary_focus) block.primaryFocus = op.primary_focus
            if (op.duration_weeks) block.durationWeeks = op.duration_weeks
          }
        } else if (op.type === 'ADD') {
          const newBlock = {
            id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: op.name || 'New Phase',
            type: op.block_type || 'BASE',
            primaryFocus: op.primary_focus || 'AEROBIC_ENDURANCE',
            durationWeeks: op.duration_weeks || 4,
            order: op.order || localBlocks.length + 1
          }
          if (op.order !== undefined) {
            localBlocks.splice(op.order - 1, 0, newBlock)
          } else {
            localBlocks.push(newBlock)
          }
        }
      }

      // Re-assign orders
      const finalBlocks = localBlocks.map((b: any, idx: number) => ({
        ...b,
        order: idx + 1
      }))

      try {
        await planService.replanStructure(userId, plan_id, finalBlocks)
        return {
          success: true,
          message: 'Plan structure modified successfully.',
          proposed_structure: finalBlocks
            .map((b: any) => `${b.name} (${b.durationWeeks}w)`)
            .join(' -> ')
        }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    }
  })
})
