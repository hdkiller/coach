import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'

export const recommendationTools = (userId: string, timezone: string) => ({
  recommend_workout: tool({
    description: 'Recommend a specific workout based on the users goal and availability.',
    parameters: z.object({
      day_of_week: z.number().describe('0=Sunday, 1=Monday...'),
      morning: z.boolean().optional(),
      afternoon: z.boolean().optional(),
      evening: z.boolean().optional(),
      bike_access: z.boolean().optional(),
      gym_access: z.boolean().optional(),
      indoor_only: z.boolean().optional(),
      notes: z.string().optional()
    }),
    execute: async (args: {
      day_of_week: number
      morning?: boolean
      afternoon?: boolean
      evening?: boolean
      bike_access?: boolean
      gym_access?: boolean
      indoor_only?: boolean
      notes?: string
    }) => {
      // Logic to select a workout from a library or generate one
      return {
        recommendation: {
          title: 'Zone 2 Endurance Ride',
          duration_minutes: 90,
          description: 'Steady state ride at 65-75% FTP.',
          tss: 60
        }
      }
    }
  }),

  get_recommendation_details: tool({
    description: 'Get full details of a specific AI recommendation.',
    parameters: z.object({
      recommendation_id: z.string()
    }),
    execute: async (args: { recommendation_id: string }) => {
      const rec = await prisma.recommendation.findUnique({
        where: { id: args.recommendation_id }
      })
      return rec || { error: 'Recommendation not found' }
    }
  }),

  list_pending_recommendations: tool({
    description: 'List current pending recommendations for the user.',
    parameters: z.object({
      status: z.string().optional().default('ACTIVE'), // Changed default to ACTIVE as pending doesn't exist in schema defaults
      priority: z.string().optional(),
      limit: z.number().optional().default(5)
    }),
    execute: async (args: { status?: string; priority?: string; limit?: number }) => {
      const recs = await prisma.recommendation.findMany({
        where: {
          userId,
          status: args.status,
          priority: args.priority
        },
        take: args.limit
      })
      return { count: recs.length, recommendations: recs }
    }
  })
})
