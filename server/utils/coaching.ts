import { H3Event } from 'h3'
import { getServerSession } from '#auth'
import { coachingRepository } from './repositories/coachingRepository'

/**
 * Gets the effective user ID for the current request.
 * If the user is a coach acting as an athlete, it returns the athlete's ID
 * after verifying the coaching relationship.
 */
export async function getEffectiveUserId(event: H3Event): Promise<string> {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const actAsUserId = getHeader(event, 'x-act-as-user')

  if (!actAsUserId || actAsUserId === userId) {
    return userId
  }

  // Verify coaching relationship
  const hasRelationship = await coachingRepository.checkRelationship(userId, actAsUserId)
  if (!hasRelationship) {
    throw createError({ 
      statusCode: 403, 
      message: 'You do not have permission to access this athlete\'s data' 
    })
  }

  return actAsUserId
}
