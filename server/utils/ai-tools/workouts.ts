import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import { plannedWorkoutRepository } from '../repositories/plannedWorkoutRepository'
import {
  getStartOfDaysAgoUTC,
  formatUserDate,
  formatDateUTC,
  getStartOfDayUTC,
  getEndOfDayUTC
} from '../../utils/date'
import { analyzeWorkoutTask } from '../../../trigger/analyze-workout'
import type { AiSettings } from '../ai-user-settings'
import { hasProtectedIntervalsTags, mergeWorkoutTags } from '../workout-tags'
import { getPendingSyncStatus } from '../structured-workout-persistence'

export const workoutTools = (userId: string, timezone: string, aiSettings: AiSettings) => ({
  get_recent_workouts: tool({
    description:
      'Get recent workouts with summary metrics (duration, TSS, intensity). Use this to see what the user has done recently.',
    inputSchema: z.object({
      limit: z.number().optional().default(5),
      type: z
        .string()
        .optional()
        .describe('Filter by sport type (Ride, Run, Swim, WeightTraining, etc)'),
      days: z.number().optional().describe('Number of days to look back')
    }),
    execute: async ({ limit = 5, type, days }) => {
      const where: any = {}

      if (type) {
        where.type = { contains: type, mode: 'insensitive' }
      }

      if (days) {
        where.date = { gte: getStartOfDaysAgoUTC(timezone, days) }
      }

      const workouts = await workoutRepository.getForUser(userId, {
        limit,
        orderBy: { date: 'desc' },
        where
      })

      return {
        count: workouts.length,
        workouts: workouts.map((w) => ({
          id: w.id,
          date: formatUserDate(w.date, timezone),
          title: w.title,
          sport: w.source === 'strava' ? w.type : w.type, // Map types if needed
          tags: w.tags,
          duration: w.durationSec,
          tss: w.tss,
          intensity: w.intensity,
          calories: w.calories,
          rpe: w.rpe,
          feel: w.feel
        }))
      }
    }
  }),

  search_workouts: tool({
    description:
      'Search for specific workouts by title, date, or unique characteristics. Useful for finding a specific session the user is referring to.',
    inputSchema: z.object({
      workout_id: z.string().optional().describe('Specific workout ID if known'),
      title_search: z.string().optional().describe('Partial title match'),
      type: z.string().optional(),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      relative_position: z.enum(['last', 'prev', 'next']).optional()
    }),
    execute: async ({ workout_id, title_search, type, date }) => {
      const where: any = {}

      if (workout_id) where.id = workout_id
      if (title_search) where.title = { contains: title_search, mode: 'insensitive' }
      if (type) where.type = { contains: type, mode: 'insensitive' }
      if (date) {
        const start = new Date(`${date}T00:00:00.000Z`)
        const end = new Date(`${date}T23:59:59.999Z`)

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          where.date = {
            gte: start,
            lte: end
          }
        }
      }

      const workouts = await workoutRepository.getForUser(userId, {
        limit: 5,
        orderBy: { date: 'desc' },
        where
      })

      return workouts.map((w) => ({
        id: w.id,
        date: formatUserDate(w.date, timezone),
        title: w.title,
        sport: w.type,
        tags: w.tags,
        duration: w.durationSec,
        tss: w.tss,
        calories: w.calories
      }))
    }
  }),

  get_workout_details: tool({
    description:
      'Get detailed metrics for a specific workout, including summary scores, planned targets, and metadata.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to analyze')
    }),
    execute: async ({ workout_id }) => {
      try {
        const workout = (await workoutRepository.getById(workout_id, userId, {
          include: {
            plannedWorkout: true,
            streams: true
          }
        })) as any

        if (!workout) {
          const planned = await prisma.plannedWorkout.findFirst({
            where: { id: workout_id, userId },
            include: {
              trainingWeek: true
            }
          })

          if (!planned) return { error: 'Workout not found' }

          return {
            ...planned,
            isPlanned: true,
            date: formatDateUTC(planned.date)
          }
        }

        return {
          ...workout,
          date: formatUserDate(workout.date, timezone),
          streams: workout.streams
            ? {
                avgPacePerKm: workout.streams.avgPacePerKm,
                paceVariability: workout.streams.paceVariability,
                hrZoneTimes: workout.streams.hrZoneTimes,
                powerZoneTimes: workout.streams.powerZoneTimes,
                paceZones: workout.streams.paceZones,
                pacingStrategy: workout.streams.pacingStrategy
              }
            : null
        }
      } catch (error: any) {
        console.error('get_workout_details primary fetch failed', {
          workoutId: workout_id,
          userId,
          error: error?.message || error
        })

        const fallbackWorkout = await prisma.workout.findFirst({
          where: { id: workout_id, userId },
          select: {
            id: true,
            userId: true,
            date: true,
            title: true,
            type: true,
            tags: true,
            durationSec: true,
            tss: true,
            intensity: true,
            calories: true,
            rpe: true,
            feel: true,
            notes: true,
            description: true,
            plannedWorkoutId: true,
            rawJson: true,
            plannedWorkout: {
              select: {
                id: true,
                title: true,
                description: true,
                durationSec: true,
                tss: true,
                structuredWorkout: true
              }
            },
            streams: {
              select: {
                avgPacePerKm: true,
                paceVariability: true,
                hrZoneTimes: true,
                powerZoneTimes: true,
                paceZones: true,
                pacingStrategy: true
              }
            }
          }
        })

        if (fallbackWorkout) {
          return {
            ...fallbackWorkout,
            date: formatUserDate(fallbackWorkout.date, timezone),
            degraded: true
          }
        }

        const planned = await prisma.plannedWorkout.findFirst({
          where: { id: workout_id, userId },
          include: { trainingWeek: true }
        })

        if (!planned) return { error: 'Workout not found' }

        return {
          ...planned,
          isPlanned: true,
          date: formatDateUTC(planned.date),
          degraded: true
        }
      }
    }
  }),

  get_workout_analysis: tool({
    description:
      'Get the deep AI-generated analysis and performance scores for a specific workout. Use this when the user asks "how did I do?" or "show me the analysis for this workout".',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to get analysis for')
    }),
    execute: async ({ workout_id }) => {
      const workout = await workoutRepository.getById(workout_id, userId, {
        select: {
          id: true,
          title: true,
          date: true,
          aiAnalysis: true,
          aiAnalysisJson: true,
          aiAnalysisStatus: true,
          overallScore: true,
          technicalScore: true,
          effortScore: true,
          pacingScore: true,
          executionScore: true,
          overallQualityExplanation: true,
          technicalExecutionExplanation: true,
          effortManagementExplanation: true,
          pacingStrategyExplanation: true,
          executionConsistencyExplanation: true
        } as any
      })

      if (!workout) return { error: 'Workout not found' }

      return {
        ...workout,
        date: formatUserDate(workout.date, timezone)
      }
    }
  }),

  analyze_activity: tool({
    description:
      'Force a deep AI analysis of a specific completed activity. Use this when the user asks for a more detailed breakdown or if the initial analysis was missing details. This runs asynchronously and does not provide autonomous completion updates; do not claim you will proactively notify the user when it finishes.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to analyze')
    }),
    needsApproval: async () => aiSettings.aiRequireToolApproval,
    execute: async ({ workout_id }) => {
      const workout = await workoutRepository.getById(workout_id, userId)
      if (!workout) return { error: 'Workout not found' }

      try {
        await analyzeWorkoutTask.trigger(
          { workoutId: workout_id },
          {
            tags: [`user:${userId}`, `workout:${workout_id}`],
            concurrencyKey: userId
          }
        )
        return {
          success: true,
          message: 'Workout re-analysis has been queued for processing.'
        }
      } catch (e: any) {
        return { error: `Failed to trigger analysis: ${e.message}` }
      }
    }
  }),

  update_workout_notes: tool({
    description:
      'Update the personal notes/memos for a specific workout. Defaults to APPEND mode to preserve existing notes. Use REPLACE only when explicitly requested by the user.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to update notes for'),
      notes: z.string().describe('The notes content to add or set (Markdown supported)'),
      mode: z
        .enum(['APPEND', 'REPLACE'])
        .optional()
        .describe('APPEND (default) adds to existing notes. REPLACE overwrites all existing notes.')
    }),
    needsApproval: async () => true,
    execute: async ({ workout_id, notes, mode = 'APPEND' }) => {
      const workout = await workoutRepository.getById(workout_id, userId)
      if (!workout) return { error: 'Workout not found' }

      try {
        const incomingNotes = notes.trim()
        const existingNotes = (workout.notes || '').trim()
        const nextNotes =
          mode === 'REPLACE'
            ? incomingNotes
            : existingNotes
              ? `${existingNotes}\n\n${incomingNotes}`
              : incomingNotes

        await workoutRepository.update(workout_id, {
          notes: nextNotes,
          notesUpdatedAt: new Date()
        })
        return {
          success: true,
          message:
            mode === 'REPLACE'
              ? 'Workout notes update prepared (REPLACE).'
              : 'Workout notes update prepared (APPEND).'
        }
      } catch (e: any) {
        return { error: `Failed to update notes: ${e.message}` }
      }
    }
  }),

  update_workout: tool({
    description:
      'Update a completed workout metadata (rename/date/description/metrics). Use update_workout_tags for tag changes.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to update'),
      title: z.string().optional().describe('New workout title'),
      type: z.string().optional().describe('New workout type/sport'),
      date: z.string().optional().describe('New workout date/time (ISO string or YYYY-MM-DD)'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Workout description. Use null to clear.'),
      duration_seconds: z.number().optional().describe('Duration in seconds'),
      distance_meters: z.number().nullable().optional().describe('Distance in meters'),
      training_load: z.number().nullable().optional().describe('Training load value'),
      tss: z.number().nullable().optional().describe('Training Stress Score')
    }),
    needsApproval: async () => true,
    execute: async ({
      workout_id,
      title,
      type,
      date,
      description,
      duration_seconds,
      distance_meters,
      training_load,
      tss
    }) => {
      const workout = await workoutRepository.getById(workout_id, userId)
      const plannedWorkout = workout
        ? null
        : await plannedWorkoutRepository.getById(workout_id, userId, {
            select: {
              id: true,
              title: true,
              type: true,
              date: true,
              durationSec: true,
              tss: true,
              syncStatus: true
            }
          })

      if (!workout && !plannedWorkout) return { error: 'Workout not found' }

      try {
        const updateData: Record<string, any> = {}
        if (title !== undefined) updateData.title = title
        if (type !== undefined) updateData.type = type
        if (description !== undefined) updateData.description = description
        if (duration_seconds !== undefined) updateData.durationSec = duration_seconds
        if (distance_meters !== undefined) updateData.distanceMeters = distance_meters
        if (training_load !== undefined) updateData.trainingLoad = training_load
        if (tss !== undefined) updateData.tss = tss

        if (date !== undefined) {
          const parsedDate = new Date(date)
          if (Number.isNaN(parsedDate.getTime())) {
            return { error: 'Invalid date format. Use ISO date/time or YYYY-MM-DD.' }
          }
          updateData.date = parsedDate
        }

        if (Object.keys(updateData).length === 0) {
          return { error: 'No fields provided to update.' }
        }

        if (plannedWorkout) {
          const plannedUpdateData: Record<string, any> = {
            modifiedLocally: true,
            syncStatus: getPendingSyncStatus((plannedWorkout as any).syncStatus),
            syncError: null
          }
          if (title !== undefined) plannedUpdateData.title = title
          if (type !== undefined) plannedUpdateData.type = type
          if (description !== undefined) plannedUpdateData.description = description
          if (duration_seconds !== undefined) plannedUpdateData.durationSec = duration_seconds
          if (distance_meters !== undefined) plannedUpdateData.distanceMeters = distance_meters
          if (tss !== undefined) plannedUpdateData.tss = tss

          if (date !== undefined) {
            const parsedDate = new Date(date)
            if (Number.isNaN(parsedDate.getTime())) {
              return { error: 'Invalid date format. Use ISO date/time or YYYY-MM-DD.' }
            }
            plannedUpdateData.date = parsedDate
          }

          const updatedPlannedWorkout = await plannedWorkoutRepository.update(
            workout_id,
            userId,
            plannedUpdateData
          )
          return {
            success: true,
            message: 'Planned workout update prepared successfully.',
            workout: {
              id: updatedPlannedWorkout.id,
              title: updatedPlannedWorkout.title,
              type: updatedPlannedWorkout.type,
              date: formatUserDate(updatedPlannedWorkout.date, timezone),
              duration: updatedPlannedWorkout.durationSec,
              tss: updatedPlannedWorkout.tss
            }
          }
        }

        const updatedWorkout = await workoutRepository.update(workout_id, updateData)
        return {
          success: true,
          message: 'Workout update prepared successfully.',
          workout: {
            id: updatedWorkout.id,
            title: updatedWorkout.title,
            type: updatedWorkout.type,
            date: formatUserDate(updatedWorkout.date, timezone),
            duration: updatedWorkout.durationSec,
            tss: updatedWorkout.tss
          }
        }
      } catch (e: any) {
        return { error: `Failed to update workout: ${e.message}` }
      }
    }
  }),

  update_workout_tags: tool({
    description:
      'Update local tags for a completed workout. Intervals-imported tags prefixed with icu: are read-only and cannot be changed manually.',
    inputSchema: z.object({
      workout_id: z.string().describe('The ID of the workout to update tags for'),
      add_tags: z.array(z.string()).optional().describe('Local tags to add'),
      remove_tags: z.array(z.string()).optional().describe('Tags to remove'),
      set_local_tags: z
        .array(z.string())
        .optional()
        .describe('Replace the local tag set while preserving icu: source tags'),
      clear_local: z
        .boolean()
        .optional()
        .describe('Remove all local tags while preserving icu: tags')
    }),
    needsApproval: async () => true,
    execute: async ({ workout_id, add_tags, remove_tags, set_local_tags, clear_local }) => {
      const workout = await workoutRepository.getById(workout_id, userId)
      if (!workout) return { error: 'Workout not found' }

      if (
        hasProtectedIntervalsTags(add_tags) ||
        hasProtectedIntervalsTags(remove_tags) ||
        hasProtectedIntervalsTags(set_local_tags)
      ) {
        return { error: 'Intervals tags are read-only. Only local tags can be edited.' }
      }

      const nextTags = mergeWorkoutTags((workout.tags as string[]) || [], {
        addLocalTags: add_tags,
        removeTags: remove_tags,
        setLocalTags: clear_local ? [] : set_local_tags
      })

      const updatedWorkout = await workoutRepository.update(workout_id, {
        tags: nextTags
      })

      return {
        success: true,
        message: 'Workout tag update prepared successfully.',
        workout: {
          id: updatedWorkout.id,
          title: updatedWorkout.title,
          tags: updatedWorkout.tags
        }
      }
    }
  }),

  get_workout_streams: tool({
    description:
      'Get raw stream data (heart rate, power, cadence) for a workout. Use sparingly for deep analysis.',
    inputSchema: z.object({
      workout_id: z.string(),
      include_streams: z
        .array(z.string())
        .optional()
        .describe('List of streams: "watts", "heartrate", "cadence"'),
      sample_rate: z.number().optional().describe('Sample every N seconds (default 1)')
    }),
    execute: async () => {
      return {
        message:
          'Stream access restricted for performance. Use get_workout_details for summary metrics.'
      }
    }
  })
})
