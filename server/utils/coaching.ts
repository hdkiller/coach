import type { H3Event } from 'h3'
import { getServerSession } from '#auth'
import { coachingRepository } from './repositories/coachingRepository'
import { oauthRepository } from './repositories/oauthRepository'
import { validateApiKey } from './auth-api-key'

/**
 * Validates an OAuth Bearer token and returns the associated user.
 */
async function validateOAuthToken(event: H3Event) {
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const tokenValue = authHeader.substring(7)
  const token = await oauthRepository.getAccessToken(tokenValue)

  if (!token || (token.accessTokenExpiresAt && token.accessTokenExpiresAt < new Date())) {
    return null
  }

  // Update usage info (async)
  prisma.oAuthToken
    .update({
      where: { id: token.id },
      data: {
        lastUsedAt: new Date(),
        lastIp:
          getHeader(event, 'x-forwarded-for')?.toString().split(',')[0] ||
          event.node.req.socket.remoteAddress
      }
    })
    .catch((e) => console.error('Failed to update token usage:', e))

  return token.user
}

/**
 * Gets the effective user ID for the current request.
 * If the user is a coach acting as an athlete, it returns the athlete's ID
 * after verifying the coaching relationship.
 */
export async function getEffectiveUserId(event: H3Event): Promise<string> {
  // 1. Try session (NuxtAuth)
  const session = await getServerSession(event)
  let userId: string | null = null

  if (session?.user) {
    userId = (session.user as any).id
  } else {
    // 2. Try API key
    const user = await validateApiKey(event)
    if (user) {
      userId = user.id
    } else {
      // 3. Try OAuth Bearer Token
      const oauthUser = await validateOAuthToken(event)
      if (oauthUser) {
        userId = oauthUser.id
      }
    }
  }

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const actAsUserId = getHeader(event, 'x-act-as-user')

  if (!actAsUserId || actAsUserId === userId) {
    return userId
  }

  // Verify coaching relationship
  const hasRelationship = await coachingRepository.checkRelationship(userId, actAsUserId)
  if (!hasRelationship) {
    throw createError({
      statusCode: 403,
      message: "You do not have permission to access this athlete's data"
    })
  }

  return actAsUserId
}
