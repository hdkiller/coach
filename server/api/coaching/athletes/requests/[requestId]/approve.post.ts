import { requireAuth } from '../../../../../utils/auth-guard'
import { createUserNotification } from '../../../../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const requestId = getRouterParam(event, 'requestId')

  if (!requestId) {
    throw createError({ statusCode: 400, message: 'Request id is required.' })
  }

  try {
    const result = await coachingRepository.approveCoachingRequest(user.id, requestId)

    try {
      await createUserNotification(result.request.athleteId, {
        title: 'Coaching request approved',
        message: `${user.name || 'Your coach'} accepted your coaching request.`,
        icon: 'i-heroicons-check-circle',
        link: '/coaching'
      })
    } catch (notifyError) {
      console.error('[ApproveCoachingRequest] Failed to notify athlete:', notifyError)
    }

    return result
  } catch (error: any) {
    throw createError({
      statusCode: error?.message === 'Request not found' ? 404 : 400,
      message: error?.message || 'Could not approve coaching request.'
    })
  }
})
