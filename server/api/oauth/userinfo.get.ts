import { oauthRepository } from '../../utils/repositories/oauthRepository'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Get User Information',
    description:
      'Returns profile information for the user associated with the provided access token.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                sub: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                image: { type: 'string' },
                ftp: { type: 'integer' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid Authorization header' })
  }

  const tokenValue = authHeader.substring(7)
  const token = await oauthRepository.getAccessToken(tokenValue)

  if (!token || (token.accessTokenExpiresAt && token.accessTokenExpiresAt < new Date())) {
    throw createError({ statusCode: 401, message: 'Invalid or expired access token' })
  }

  const user = token.user

  if (user.deactivatedAt) {
    throw createError({ statusCode: 403, message: 'Account deactivated' })
  }

  // Update last used info
  await prisma.oAuthToken.update({
    where: { id: token.id },
    data: {
      lastUsedAt: new Date(),
      lastIp:
        getHeader(event, 'x-forwarded-for')?.toString().split(',')[0] ||
        event.node.req.socket.remoteAddress
    }
  })

  // Basic Profile (OpenID Connect compatible fields)
  const userInfo: any = {
    sub: user.id,
    name: user.name,
    email: user.email,
    picture: user.image
  }

  // Conditional fields based on scopes
  if (token.scopes.includes('profile:read')) {
    userInfo.ftp = user.ftp
    userInfo.weight = user.weight
  }

  return userInfo
})
