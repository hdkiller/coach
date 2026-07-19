import { requireAuth } from '../../../../../utils/auth-guard'
import { createUserNotification } from '../../../../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const requestId = getRouterParam(event, 'requestId')

  if (!requestId) {
    throw createError({ statusCode: 400, message: 'Request id is required.' })
  }

  try {
    const request = await coachingRepository.declineCoachingRequest(user.id, requestId)

    try {
      await createUserNotification(request.athleteId, {
        title: 'Coaching request declined',
        message: `${user.name || 'A coach'} declined your coaching request.`,
        icon: 'i-heroicons-x-circle',
        link: '/coaching'
      })
    } catch (notifyError) {
      console.error('[DeclineCoachingRequest] Failed to notify athlete:', notifyError)
    }

    return request
  } catch (error: any) {
    throw createError({
      statusCode: error?.message === 'Request not found' ? 404 : 400,
      message: error?.message || 'Could not decline coaching request.'
    })
  }
})
