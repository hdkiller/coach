import { analyticsRepository } from './repositories/analyticsRepository'
import { coachingRepository } from './repositories/coachingRepository'
import { teamRepository } from './repositories/teamRepository'
import { prisma } from './db'

export interface AnalyticsScopeInput {
  target: 'self' | 'athlete' | 'athletes' | 'athlete_group' | 'team'
  targetId?: string
  targetIds?: string[]
}

export async function assertAnalyticsScopeAccess(userId: string, scope: AnalyticsScopeInput) {
  if (scope.target === 'self') return

  if (scope.target === 'athlete' && scope.targetId) {
    const isCoaching = await coachingRepository.checkRelationship(userId, scope.targetId)
    if (isCoaching) return

    const teams = await teamRepository.getTeamsForUser(userId)
    for (const team of teams) {
      const athleteInTeam = await teamRepository.checkTeamAccess(team.teamId, scope.targetId)
      if (athleteInTeam) return
    }

    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this athlete' })
  }

  if (scope.target === 'athletes' && scope.targetIds?.length) {
    for (const athleteId of scope.targetIds) {
      const isCoaching = await coachingRepository.checkRelationship(userId, athleteId)
      if (isCoaching) continue

      const teams = await teamRepository.getTeamsForUser(userId)
      let hasTeamAccess = false

      for (const team of teams) {
        const athleteInTeam = await teamRepository.checkTeamAccess(team.teamId, athleteId)
        if (athleteInTeam) {
          hasTeamAccess = true
          break
        }
      }

      if (!hasTeamAccess) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have access to one or more selected athletes'
        })
      }
    }

    return
  }

  if (scope.target === 'athlete_group' && scope.targetId) {
    const isOwner = await teamRepository.checkGroupOwnership(scope.targetId, userId)
    if (isOwner) return

    const group = await (prisma as any).athleteGroup.findUnique({ where: { id: scope.targetId } })
    if (group?.teamId) {
      const isStaff = await teamRepository.checkTeamAccess(group.teamId, userId, [
        'OWNER',
        'ADMIN',
        'COACH'
      ])
      if (isStaff) return
    }

    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this group' })
  }

  if (scope.target === 'team' && scope.targetId) {
    const isStaff = await teamRepository.checkTeamAccess(scope.targetId, userId, [
      'OWNER',
      'ADMIN',
      'COACH'
    ])
    if (!isStaff) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only team staff can query team-wide analytics'
      })
    }
  }
}

export async function resolveAnalyticsScopeUserIds(userId: string, scope: AnalyticsScopeInput) {
  await assertAnalyticsScopeAccess(userId, scope)
  return analyticsRepository.resolveTargetUserIds(userId, scope)
}
