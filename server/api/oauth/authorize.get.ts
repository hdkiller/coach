import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Authorize OAuth Application',
    description:
      'Initiates the OAuth 2.0 authorization code flow. Validates parameters and redirects to the consent screen.',
    parameters: [
      {
        name: 'response_type',
        in: 'query',
        required: true,
        schema: { type: 'string', enum: ['code'] }
      },
      { name: 'client_id', in: 'query', required: true, schema: { type: 'string' } },
      {
        name: 'redirect_uri',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'uri' }
      },
      { name: 'scope', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'state', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'prompt', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'code_challenge', in: 'query', required: false, schema: { type: 'string' } },
      {
        name: 'code_challenge_method',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['S256', 'plain'] }
      }
    ],
    responses: {
      302: { description: 'Redirect to Consent Screen' },
      400: { description: 'Bad Request' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const responseType = query.response_type as string
  const clientId = query.client_id as string
  const redirectUri = query.redirect_uri as string
  const scope = query.scope as string
  const state = query.state as string
  const prompt = query.prompt as string
  const codeChallenge = query.code_challenge as string
  const codeChallengeMethod = query.code_challenge_method as string

  // 1. Basic Parameter Validation
  if (!responseType || !clientId || !redirectUri) {
    throw createError({
      statusCode: 400,
      message:
        'Missing required parameters: response_type, client_id, and redirect_uri are required.'
    })
  }

  if (responseType !== 'code') {
    throw createError({
      statusCode: 400,
      message: 'Unsupported response_type. Only "code" is supported.'
    })
  }

  // 2. Client Validation
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId }
  })

  if (!app) {
    throw createError({ statusCode: 400, message: 'Invalid client_id.' })
  }

  // 3. Redirect URI Validation
  if (!app.redirectUris.includes(redirectUri)) {
    throw createError({
      statusCode: 400,
      message:
        'The redirect_uri provided does not match any registered redirect URIs for this application.'
    })
  }

  // 4. Redirect to Consent Screen
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl

  const consentUrl = new URL('/oauth/authorize', siteUrl)
  consentUrl.searchParams.set('client_id', clientId)
  consentUrl.searchParams.set('redirect_uri', redirectUri)
  consentUrl.searchParams.set('scope', scope || 'profile:read')
  if (state) consentUrl.searchParams.set('state', state)
  if (prompt) consentUrl.searchParams.set('prompt', prompt)
  if (codeChallenge) {
    consentUrl.searchParams.set('code_challenge', codeChallenge)
    consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod || 'S256')
  }

  return sendRedirect(event, consentUrl.toString())
})
