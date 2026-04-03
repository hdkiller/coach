import { requireAuth } from '../../../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Revoke athlete invite',
    description: 'Revokes a pending coach-generated athlete invite.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      404: { description: 'Invite not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const inviteId = getRouterParam(event, 'inviteId')

  if (!inviteId) {
    throw createError({ statusCode: 400, message: 'Invite ID is required' })
  }

  try {
    await coachingRepository.revokeAthleteInviteForCoach(user.id, inviteId)
    return { success: true }
  } catch (error: any) {
    throw createError({ statusCode: 404, message: error.message || 'Invite not found' })
  }
})
