import { getServerSession } from '../../../utils/session'
import { generateCodeVerifier, generateCodeChallenge } from '../../../utils/pkce'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Authorize Garmin Connect',
    description:
      'Initiates the OAuth2 with PKCE flow for Garmin Connect integration. Redirects to Garmin.',
    responses: {
      302: { description: 'Redirect to Garmin' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const config = useRuntimeConfig()
  const clientId = process.env.GARMIN_CLIENT_ID
  const redirectUri = `${config.public.siteUrl}/api/integrations/garmin/callback`

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'Garmin client ID not configured'
    })
  }

  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)

  // Store verifier in a cookie to retrieve in callback
  setCookie(event, 'garmin_code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/'
  })

  const authUrl = new URL('https://connect.garmin.com/oauth2Confirm')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return sendRedirect(event, authUrl.toString())
})
