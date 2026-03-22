import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'
import { coachingRepository } from '../../../../utils/repositories/coachingRepository'

const addMemberSchema = z.object({
  athleteId: z.string().uuid()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'Add athlete to group',
    description: 'Adds an athlete to a specific athlete group.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      201: { description: 'Added' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Group or Athlete not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const groupId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = addMemberSchema.safeParse(body)

  if (!groupId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const { athleteId } = result.data
  const group = await teamRepository.getGroupDetails(groupId)

  if (!group) {
    throw createError({ statusCode: 404, message: 'Group not found' })
  }

  // Permission: Must be group owner or team coach
  if (group.teamId) {
    const hasAccess = await teamRepository.checkTeamAccess(group.teamId, user.id, [
      'OWNER',
      'ADMIN',
      'COACH'
    ])
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions for this team group'
      })
    }

    // Verify athlete is also in the team
    const athleteInTeam = await teamRepository.checkTeamAccess(group.teamId, athleteId)
    if (!athleteInTeam) {
      // Optional: Auto-add to team? For now, require they are already in the team or connected as athlete.
      // Actually, coaching relationship is usually enough.
    }
  } else {
    if (group.coachId !== user.id) {
      throw createError({ statusCode: 403, message: 'You do not own this group' })
    }
  }

  // Security: Check if coach has a relationship with this athlete (standard requirement)
  // unless they are in the same team (we can loosen this later if needed)
  const isCoached = await coachingRepository.checkRelationship(user.id, athleteId)
  if (!isCoached) {
    // Check if team-based relationship exists
    if (group.teamId) {
      const athleteInTeam = await teamRepository.checkTeamAccess(group.teamId, athleteId)
      if (!athleteInTeam) {
        throw createError({
          statusCode: 403,
          message: 'Athlete must be coached by you or be in the same team'
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: 'You can only add athletes you are coaching to private groups'
      })
    }
  }

  const membership = await teamRepository.addAthleteToGroup(groupId, athleteId)

  setResponseStatus(event, 201)
  return membership
})
