import { requireAuth } from '../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  return await coachingRepository.getPendingCoachingRequestsForCoach(user.id)
})
