import { requireAuth } from '../../../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const requestId = getRouterParam(event, 'requestId')

  if (!requestId) {
    throw createError({ statusCode: 400, message: 'Request id is required.' })
  }

  try {
    return await coachingRepository.declineCoachingRequest(user.id, requestId)
  } catch (error: any) {
    throw createError({
      statusCode: error?.message === 'Request not found' ? 404 : 400,
      message: error?.message || 'Could not decline coaching request.'
    })
  }
})
