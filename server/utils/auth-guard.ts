import type { H3Event } from 'h3'
import { oauthRepository } from './repositories/oauthRepository'
import { validateApiKey } from './auth-api-key'
import { getServerSession } from './session'
import { prisma } from './db'

/**
 * Validates an OAuth Bearer token.
 * @returns The user and token info if valid, null otherwise.
 */
export async function validateOAuthToken(event: H3Event) {
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

  return {
    user: token.user,
    scopes: token.scopes,
    appId: token.appId
  }
}

/**
 * Unified auth guard that supports Session, API Key, and OAuth Bearer tokens.
 * @param event - H3 event
 * @param requiredScopes - Optional scopes for OAuth tokens (Sessions and API keys are assumed to have all scopes)
 */
export async function requireAuth(event: H3Event, requiredScopes?: string[]) {
  // 1. Try Session (NuxtAuth) - Full access
  const session = await getServerSession(event)
  if ((session?.user as any)?.id) {
    const user = await prisma.user.findUnique({
      where: { id: (session!.user as any).id }
    })
    if (user) {
      event.context.user = user
      event.context.session = session
      event.context.authType = 'session'
      return user
    }
  }

  // 2. Try API Key - Full access
  const apiKeyUser = await validateApiKey(event)
  if (apiKeyUser) {
    event.context.user = apiKeyUser
    event.context.authType = 'api_key'
    return apiKeyUser
  }

  // 3. Try OAuth Bearer Token - Scoped access
  const oauth = await validateOAuthToken(event)
  if (oauth) {
    // Check scopes if required
    if (requiredScopes && requiredScopes.length > 0) {
      const hasScopes = requiredScopes.every((s) => oauth.scopes.includes(s))
      if (!hasScopes) {
        throw createError({
          statusCode: 403,
          message: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
        })
      }
    }

    event.context.user = oauth.user
    event.context.authType = 'oauth'
    event.context.oauthAppId = oauth.appId
    event.context.oauthScopes = oauth.scopes

    return oauth.user
  }

  throw createError({
    statusCode: 401,
    message: 'Unauthorized'
  })
}
