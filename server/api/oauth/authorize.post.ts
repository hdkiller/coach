import { oauthRepository } from '../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../utils/coaching'
import { prisma } from '../../utils/db'

function normalizeBodyValue(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function normalizePayloadString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function normalizeAuthorizeBody(body: unknown) {
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body).entries())
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return Object.fromEntries(
      Array.from(body.entries()).map(([key, value]) => [key, normalizeBodyValue(value)])
    )
  }

  return body && typeof body === 'object' ? body : {}
}

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Approve Authorization Request',
    description: 'Called by the consent screen to approve or deny an authorization request.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['client_id', 'redirect_uri', 'action'],
            properties: {
              client_id: { type: 'string' },
              redirect_uri: { type: 'string', format: 'uri' },
              scope: { type: 'string' },
              state: { type: 'string' },
              code_challenge: { type: 'string' },
              code_challenge_method: { type: 'string' },
              action: { type: 'string', enum: ['approve', 'deny'] }
            }
          }
        },
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            required: ['client_id', 'redirect_uri', 'action'],
            properties: {
              client_id: { type: 'string' },
              redirect_uri: { type: 'string', format: 'uri' },
              scope: { type: 'string' },
              state: { type: 'string' },
              code_challenge: { type: 'string' },
              code_challenge_method: { type: 'string' },
              action: { type: 'string', enum: ['approve', 'deny'] }
            }
          }
        }
      }
    },
    responses: {
      303: { description: 'Redirect to client callback URL' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const body = normalizeAuthorizeBody(await readBody(event))
  const query = getQuery(event)
  const payload = {
    ...query,
    ...body
  }
  const client_id = normalizePayloadString(payload.client_id)
  const redirect_uri = normalizePayloadString(payload.redirect_uri)
  const scope = normalizePayloadString(payload.scope)
  const state = normalizePayloadString(payload.state)
  const code_challenge = normalizePayloadString(payload.code_challenge)
  const code_challenge_method = normalizePayloadString(payload.code_challenge_method)
  const action = normalizePayloadString(payload.action)

  if (!client_id || !redirect_uri || !action) {
    throw createError({ statusCode: 400, message: 'Missing required fields.' })
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: client_id }
  })

  if (!app) {
    throw createError({ statusCode: 400, message: 'Invalid client_id.' })
  }

  if (!app.redirectUris.includes(redirect_uri)) {
    throw createError({
      statusCode: 400,
      message:
        'The redirect_uri provided does not match any registered redirect URIs for this application.'
    })
  }

  // Handle Denial
  if (action !== 'approve') {
    const errorUrl = new URL(redirect_uri)
    errorUrl.searchParams.set('error', 'access_denied')
    errorUrl.searchParams.set('error_description', 'The user denied the request.')
    if (state) errorUrl.searchParams.set('state', state)

    return sendRedirect(event, errorUrl.toString(), 303)
  }

  // Handle Approval
  const scopes = scope ? scope.split(/[\s,]+/) : ['profile:read']

  const authCode = await oauthRepository.createAuthCode({
    appId: app.id,
    userId,
    redirectUri: redirect_uri,
    scopes,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method
  })

  const successUrl = new URL(redirect_uri)
  successUrl.searchParams.set('code', authCode.code)
  if (state) successUrl.searchParams.set('state', state)

  return sendRedirect(event, successUrl.toString(), 303)
})
