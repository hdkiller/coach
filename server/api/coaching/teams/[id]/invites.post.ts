import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

const createInviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'COACH', 'ATHLETE']).default('ATHLETE')
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Create team invite',
    description: 'Generates a new invite code for the team.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      201: { description: 'Created' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = createInviteSchema.safeParse(body)

  if (!teamId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  // Permission Check: Must be ADMIN or OWNER
  const hasAccess = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Safety: only OWNER can invite other ADMINS
  if (result.data.role === 'ADMIN') {
    const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only team owners can invite admins' })
    }
  }

  const invite = await teamRepository.createTeamInvite(teamId, result.data)

  setResponseStatus(event, 201)
  return invite
})
