import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { getStartOfDaysAgoUTC, formatUserDate } from '../../utils/date'

export const workoutTools = (userId: string, timezone: string) => ({
  get_recent_workouts: tool({
    description:
      'Get recent workouts with summary metrics (duration, TSS, intensity). Use this to see what the user has done recently.',
    parameters: z.object({
      limit: z.number().optional().default(5),
      type: z
        .string()
        .optional()
        .describe('Filter by sport type (Ride, Run, Swim, WeightTraining, etc)'),
      days: z.number().optional().describe('Number of days to look back')
    }),
    execute: async ({
      limit = 5,
      type,
      days
    }: {
      limit?: number
      type?: string
      days?: number
    }) => {
      const where: any = { userId }

      if (type) {
        where.type = { contains: type, mode: 'insensitive' }
      }

      if (days) {
        where.date = { gte: getStartOfDaysAgoUTC(timezone, days) }
      }

      const workouts = await prisma.workout.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit
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
          rpe: w.rpe,
          feel: w.feel
        }))
      }
    }
  }),

  search_workouts: tool({
    description:
      'Search for specific workouts by title, date, or unique characteristics. Useful for finding a specific session the user is referring to.',
    parameters: z.object({
      workout_id: z.string().optional().describe('Specific workout ID if known'),
      title_search: z.string().optional().describe('Partial title match'),
      type: z.string().optional(),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      relative_position: z.enum(['last', 'prev', 'next']).optional()
    }),
    execute: async (args: {
      workout_id?: string
      title_search?: string
      type?: string
      date?: string
      relative_position?: string
    }) => {
      const where: any = { userId }

      if (args.workout_id) where.id = args.workout_id
      if (args.title_search) where.title = { contains: args.title_search, mode: 'insensitive' }
      if (args.type) where.type = { contains: args.type, mode: 'insensitive' }
      if (args.date) {
        const start = new Date(args.date)
        const end = new Date(args.date)
        end.setDate(end.getDate() + 1)
        where.date = { gte: start, lt: end }
      }

      const workouts = await prisma.workout.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 5
      })

      return workouts.map((w) => ({
        id: w.id,
        date: formatUserDate(w.date, timezone),
        title: w.title,
        sport: w.type,
        duration: w.durationSec,
        tss: w.tss
      }))
    }
  }),

  get_activity_details: tool({
    description:
      'Get detailed metrics for a specific workout, including intervals, power curve, and heart rate data.',
    parameters: z.object({
      workout_id: z.string().describe('The ID of the workout to analyze')
    }),
    execute: async (args: { workout_id: string }) => {
      const workout = await prisma.workout.findFirst({
        where: { id: args.workout_id, userId }
      })

      if (!workout) return { error: 'Workout not found' }

      return {
        ...workout,
        date: formatUserDate(workout.date, timezone),
        power_curve: 'Not available', // Placeholder
        intervals: [] // Placeholder
      }
    }
  }),

  get_workout_streams: tool({
    description:
      'Get raw stream data (heart rate, power, cadence) for a workout. Use sparingly for deep analysis.',
    parameters: z.object({
      workout_id: z.string(),
      include_streams: z
        .array(z.string())
        .optional()
        .describe('List of streams: "watts", "heartrate", "cadence"'),
      sample_rate: z.number().optional().describe('Sample every N seconds (default 1)')
    }),
    execute: async (args: {
      workout_id: string
      include_streams?: string[]
      sample_rate?: number
    }) => {
      return {
        message:
          'Stream access restricted for performance. Use get_activity_details for summary metrics.'
      }
    }
  })
})
