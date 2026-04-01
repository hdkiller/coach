import { requireAuth } from '../../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'List athlete invites',
    description: 'Returns the pending coach-generated athlete invites for the authenticated coach.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  return await coachingRepository.getPendingAthleteInvitesForCoach(user.id)
})
