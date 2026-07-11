import { tool } from 'ai'
import { z } from 'zod/v3'
import { recommendationRepository } from '../repositories/recommendationRepository'
import { activityRecommendationRepository } from '../repositories/activityRecommendationRepository'
import { getUserLocalDate } from '../date'

function formatActivityRecommendation(rec: {
  id: string
  recommendation: string
  confidence: number
  reasoning: string
  analysisJson?: unknown
  plannedWorkout?: {
    id: string
    title: string
    type: string | null
    durationSec: number | null
    tss: number | null
    description: string | null
  } | null
}) {
  const analysis = (rec.analysisJson || {}) as Record<string, any>
  const planned = rec.plannedWorkout
  const modifications = analysis.suggested_modifications

  if (planned) {
    return {
      source: 'activity_recommendation' as const,
      recommendation_id: rec.id,
      title: planned.title,
      type: planned.type || 'Ride',
      duration_minutes: planned.durationSec ? Math.round(planned.durationSec / 60) : undefined,
      tss: planned.tss ?? undefined,
      description: planned.description || rec.recommendation,
      decision: rec.recommendation,
      confidence: rec.confidence,
      reasoning: rec.reasoning,
      planned_workout_id: planned.id
    }
  }

  if (modifications && typeof modifications === 'object') {
    return {
      source: 'activity_recommendation' as const,
      recommendation_id: rec.id,
      title: modifications.new_title || 'Suggested workout',
      type: analysis.suggested_type || analysis.workout_type || undefined,
      duration_minutes:
        typeof modifications.new_duration_min === 'number'
          ? modifications.new_duration_min
          : undefined,
      tss: typeof modifications.new_tss === 'number' ? modifications.new_tss : undefined,
      description: modifications.description || rec.recommendation,
      decision: rec.recommendation,
      confidence: rec.confidence,
      reasoning: rec.reasoning
    }
  }

  return {
    source: 'activity_recommendation' as const,
    recommendation_id: rec.id,
    title: rec.recommendation,
    description: rec.reasoning,
    decision: rec.recommendation,
    confidence: rec.confidence,
    reasoning: rec.reasoning
  }
}

export const recommendationTools = (userId: string, timezone: string) => ({
  recommend_workout: tool({
    description:
      'Recommend a specific workout based on the users goal and availability. This is read-only and does not create, schedule, publish, or sync a workout. If the user asks to generate, create, schedule, send, or sync a workout, use create_planned_workout instead.',
    inputSchema: z.object({
      day_of_week: z.number().describe('0=Sunday, 1=Monday...'),
      morning: z.boolean().optional(),
      afternoon: z.boolean().optional(),
      evening: z.boolean().optional(),
      bike_access: z.boolean().optional(),
      gym_access: z.boolean().optional(),
      indoor_only: z.boolean().optional(),
      notes: z.string().optional()
    }),
    execute: async (args) => {
      const today = getUserLocalDate(timezone)
      const activityRec = await activityRecommendationRepository.findToday(userId, today)

      if (activityRec && activityRec.status === 'COMPLETED') {
        return {
          created: false,
          synced: false,
          next_action:
            'This is only a recommendation. To put it on the calendar or publish it to Intervals.icu, call create_planned_workout with these details.',
          recommendation: formatActivityRecommendation(activityRec)
        }
      }

      const recs = await recommendationRepository.list(userId, {
        status: 'ACTIVE',
        limit: 10
      })

      if (recs.length > 0) {
        const pinned = recs.find((rec) => rec.isPinned)
        const selected = pinned || recs[0]
        if (!selected) {
          return {
            created: false,
            synced: false,
            success: false,
            error:
              'No workout recommendation is available yet. Use list_pending_recommendations or wait for the daily readiness analysis to complete.',
            next_action:
              'If the user wants a workout on the calendar, ask clarifying questions and use create_planned_workout once sport, duration, and date are clear.'
          }
        }
        return {
          created: false,
          synced: false,
          next_action:
            'This is only a recommendation. To put it on the calendar or publish it to Intervals.icu, call create_planned_workout with these details.',
          recommendation: {
            source: 'profile_recommendation' as const,
            recommendation_id: selected.id,
            title: selected.title,
            description: selected.description,
            category: selected.category,
            metric: selected.metric,
            priority: selected.priority,
            notes: args.notes || undefined
          }
        }
      }

      return {
        created: false,
        synced: false,
        success: false,
        error:
          'No workout recommendation is available yet. Use list_pending_recommendations or wait for the daily readiness analysis to complete.',
        next_action:
          'If the user wants a workout on the calendar, ask clarifying questions and use create_planned_workout once sport, duration, and date are clear.'
      }
    }
  }),

  get_recommendation_details: tool({
    description: 'Get full details of a specific AI recommendation.',
    inputSchema: z.object({
      recommendation_id: z.string()
    }),
    execute: async ({ recommendation_id }) => {
      const rec = await recommendationRepository.findById(recommendation_id, userId)
      return rec || { error: 'Recommendation not found' }
    }
  }),

  list_pending_recommendations: tool({
    description: 'List current pending recommendations for the user.',
    inputSchema: z.object({
      status: z.string().optional().default('ACTIVE'), // Changed default to ACTIVE as pending doesn't exist in schema defaults
      priority: z.string().optional(),
      limit: z.number().optional().default(5)
    }),
    execute: async ({ status = 'ACTIVE', priority, limit = 5 }) => {
      const recs = await recommendationRepository.list(userId, {
        status,
        limit
        // Priority filtering logic is custom in the old code, repo supports some filters but maybe not priority directly?
        // Repo code: if (filters.metric) where.metric = ...
        // Repo code does NOT have priority filter.
        // But we can filter in memory or update repo.
        // Let's check repo again.
      })

      // If priority was requested, filter manually since repo doesn't support it yet
      let filteredRecs = recs
      if (priority) {
        filteredRecs = recs.filter((r) => r.priority === priority)
      }

      return { count: filteredRecs.length, recommendations: filteredRecs }
    }
  })
})
