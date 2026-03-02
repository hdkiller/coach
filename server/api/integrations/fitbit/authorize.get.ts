import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Authorize Fitbit',
    description: 'Initiates the OAuth flow for Fitbit integration. Redirects to Fitbit.',
    responses: {
      302: { description: 'Redirect to Fitbit' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const config = useRuntimeConfig()
  const rawClientId = process.env.FITBIT_CLIENT_ID
  const siteUrl = (config.public.siteUrl || 'http://localhost:3099').replace(/\/$/, '')
  const clientId = rawClientId?.replace(/^"|"$/g, '')
  const redirectUri = `${siteUrl}/api/integrations/fitbit/callback`

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'Fitbit client ID not configured'
    })
  }

  const state =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  setCookie(event, 'fitbit_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/'
  })

  const scope = 'nutrition sleep heartrate'

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state
  })

  const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`

  return sendRedirect(event, authUrl)
})
