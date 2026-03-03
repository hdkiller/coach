import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import {
  getStartOfDaysAgoUTC,
  formatUserDate,
  formatDateUTC,
  getStartOfDayUTC,
  getEndOfDayUTC
} from '../../utils/date'
import { analyzeWorkoutTask } from '../../../trigger/analyze-workout'
import type { AiSettings } from '../ai-user-settings'

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
        const parts = date.split('-')
        if (parts.length === 3) {
          // Create UTC date from parts (Month is 0-indexed)
          const start = new Date(`${date}T00:00:00Z`)
          where.date = {
            gte: start,
            lte: start
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
      const workout = (await workoutRepository.getById(workout_id, userId, {
        include: {
          plannedWorkout: true,
          streams: true
        }
      })) as any

      if (!workout) {
        // Fallback to planned workout
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
        // Clean up large stream data for context safety while keeping computed metrics
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
      'Force a deep AI analysis of a specific completed activity. Use this when the user asks for a more detailed breakdown or if the initial analysis was missing details.',
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
          message: 'Workout re-analysis has been prepared and is ready to be queued.'
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
      'Update a completed workout metadata (rename/retag/date/description/metrics). Use this when the user asks to rename or retag an existing activity.',
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
      if (!workout) return { error: 'Workout not found' }

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
