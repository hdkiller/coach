import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { analyticsRepository } from '../../utils/repositories/analyticsRepository'
import { teamRepository } from '../../utils/repositories/teamRepository'
import { coachingRepository } from '../../utils/repositories/coachingRepository'

const querySchema = z.object({
  source: z.enum(['workouts', 'wellness', 'nutrition']),
  scope: z.object({
    target: z.enum(['self', 'athlete', 'athlete_group', 'team']),
    targetId: z.string().optional()
  }).default({ target: 'self' }),
  timeRange: z.object({
    startDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
    endDate: z.union([z.string(), z.date()]).pipe(z.coerce.date())
  }),
  grouping: z.enum(['daily', 'weekly', 'monthly']),
  metrics: z.array(z.object({
    field: z.string(),
    aggregation: z.enum(['sum', 'avg', 'max', 'min', 'count'])
  })).default([]),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'in', 'gt', 'lt']),
    value: z.any()
  })).optional()
}).passthrough()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = querySchema.safeParse(body)

  if (!result.success) {
    console.error('[AnalyticsQuery] Validation Error:', JSON.stringify(result.error.issues, null, 2))
    console.error('[AnalyticsQuery] Payload:', JSON.stringify(body, null, 2))
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query configuration',
      data: result.error.issues
    })
  }

  const options = result.data

  if (!options.metrics || options.metrics.length === 0) {
    return { labels: [], datasets: [] }
  }

  // Permission Verification
  if (options.scope.target !== 'self') {
    if (options.scope.target === 'athlete' && options.scope.targetId) {
      const isCoaching = await coachingRepository.checkRelationship(user.id, options.scope.targetId)
      // Also check if athlete is in one of the user's teams
      if (!isCoaching) {
        // Find if they share any team
        const teams = await teamRepository.getTeamsForUser(user.id)
        let inSharedTeam = false
        for (const t of teams) {
          const athleteInTeam = await teamRepository.checkTeamAccess(t.teamId, options.scope.targetId)
          if (athleteInTeam) {
            inSharedTeam = true
            break
          }
        }
        if (!inSharedTeam) {
          throw createError({ statusCode: 403, message: 'You do not have access to this athlete' })
        }
      }
    } else if (options.scope.target === 'athlete_group' && options.scope.targetId) {
      const isOwner = await teamRepository.checkGroupOwnership(options.scope.targetId, user.id)
      if (!isOwner) {
        // Check if it's a team-scoped group and user is staff in that team
        const group = await (prisma as any).athleteGroup.findUnique({ where: { id: options.scope.targetId } })
        if (group?.teamId) {
          const isStaff = await teamRepository.checkTeamAccess(group.teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
          if (!isStaff) throw createError({ statusCode: 403, message: 'You do not have access to this group' })
        } else {
          throw createError({ statusCode: 403, message: 'You do not have access to this group' })
        }
      }
    } else if (options.scope.target === 'team' && options.scope.targetId) {
      const isStaff = await teamRepository.checkTeamAccess(options.scope.targetId, user.id, ['OWNER', 'ADMIN', 'COACH'])
      if (!isStaff) {
        throw createError({ statusCode: 403, message: 'Only team staff can query team-wide analytics' })
      }
    }
  }

  return await analyticsRepository.query(user.id, options as any)
})
