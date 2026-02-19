import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { generateStructuredWorkoutTask } from '../../../trigger/generate-structured-workout'
import { adjustStructuredWorkoutTask } from '../../../trigger/adjust-structured-workout'
import { syncPlannedWorkoutToIntervals } from '../../utils/intervals-sync'
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
import { metabolicService } from '../services/metabolicService'
import type { AiSettings } from '../ai-user-settings'
import {
  getUserLocalDate,
  formatUserDate,
  formatDateUTC,
  getStartOfLocalDateUTC,
  getEndOfLocalDateUTC
} from '../../utils/date'

const structuredWorkoutSchema = z
  .object({
    description: z.string().optional(),
    coachInstructions: z.string().optional(),
    messages: z.array(z.string()).optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
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

const getPendingSyncStatus = (syncStatus: string | null | undefined) => {
  return syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING'
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
          syncStatus: true
        }
      })) as any

      if (!existing) return { error: 'Planned workout not found' }

      const normalized = normalizeStructuredWorkoutRepetition(structured_workout)

      const updated = (await plannedWorkoutRepository.update(workout_id, userId, {
        structuredWorkout: normalized as any,
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
          structuredWorkout: true
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

        const normalized = normalizeStructuredWorkoutRepetition(patched)

        const updated = (await plannedWorkoutRepository.update(workout_id, userId, {
          structuredWorkout: normalized as any,
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
    description: 'Create a future planned workout in the calendar.',
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
        .describe('Intensity description (e.g. "Zone 2", "Intervals")')
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
      // Create a PlannedWorkout, not a Workout
      const workout = await plannedWorkoutRepository.create({
        userId,
        date: new Date(`${args.date}T00:00:00Z`),
        startTime: args.time_of_day,
        title: args.title,
        description: args.description || args.intensity,
        type: args.type,
        durationSec: args.duration_minutes * 60,
        tss: args.tss,
        externalId: `ai-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        completionStatus: 'PENDING'
      })

      // Trigger structured workout generation
      try {
        await generateStructuredWorkoutTask.trigger(
          {
            plannedWorkoutId: workout.id // Pass plannedWorkoutId
          },
          {
            tags: [`user:${userId}`, `planned-workout:${workout.id}`],
            concurrencyKey: userId
          }
        )
      } catch (e) {
        console.error('Failed to trigger structured workout generation:', e)
      }

      return {
        success: true,
        workout_id: workout.id,
        message: 'Planned workout created and structured generation started.'
      }
    }
  }),

  update_planned_workout: tool({
    description: 'Update an existing planned workout (rename, reschedule, etc).',
    inputSchema: z.object({
      workout_id: z.string(),
      date: z.string().optional(),
      time_of_day: z.string().optional().describe('Time in HH:mm format'),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      duration_minutes: z.number().optional(),
      tss: z.number().optional()
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async (args) => {
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
        data.date = new Date(`${args.date}T00:00:00Z`)
      }
      data.modifiedLocally = true
      data.syncStatus = nextSyncStatus
      data.syncError = null

      const workout = await plannedWorkoutRepository.update(args.workout_id, userId, data)

      // Trigger regeneration of structured intervals
      try {
        await generateStructuredWorkoutTask.trigger(
          {
            plannedWorkoutId: workout.id
          },
          {
            tags: [`user:${userId}`, `planned-workout:${workout.id}`],
            concurrencyKey: userId
          }
        )
      } catch (e) {
        console.error('Failed to trigger structured workout regeneration:', e)
      }

      return {
        success: true,
        workout_id: workout.id,
        status: nextSyncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'QUEUED_FOR_SYNC'
      }
    }
  }),

  reschedule_planned_workout: tool({
    description:
      'Reschedule an existing planned workout to a new date/time. Prefer this over delete + create when moving sessions.',
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

      if (!workoutId) {
        if (!args.current_date) {
          return {
            success: false,
            error:
              'workout_id is required unless you provide current_date for lookup before rescheduling.'
          }
        }

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
        date: new Date(`${args.new_date}T00:00:00Z`),
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
      // Trigger adjustment task
      try {
        await adjustStructuredWorkoutTask.trigger(
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
        return { success: true, message: 'Workout adjustment started.' }
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
      try {
        await generateStructuredWorkoutTask.trigger(
          { plannedWorkoutId: workout_id },
          {
            tags: [`user:${userId}`, `planned-workout:${workout_id}`],
            concurrencyKey: userId
          }
        )
        return { success: true, message: 'Structure regeneration started.' }
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

      const isLocal = workout.syncStatus === 'LOCAL_ONLY' || !isIntervalsEventId(workout.externalId)

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
          sportSettings: sportSettings || undefined
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
          return { success: true, message: 'Workout published to Intervals.icu.' }
        } else {
          await updateIntervalsPlannedWorkout(integration, workout.externalId, {
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
          return { success: true, message: 'Workout updated on Intervals.icu.' }
        }
      } catch (e: any) {
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
