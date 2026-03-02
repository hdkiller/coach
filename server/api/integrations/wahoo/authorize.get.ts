import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Authorize Wahoo',
    description: 'Initiates the OAuth flow for Wahoo integration. Redirects to Wahoo.',
    responses: {
      302: { description: 'Redirect to Wahoo' },
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
  const clientId = process.env.WAHOO_CLIENT_ID
  const redirectUri = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/wahoo/callback`

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'Wahoo client ID not configured'
    })
  }

  // Generate a random state parameter for CSRF protection
  const state =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Store state in a secure cookie
  setCookie(event, 'wahoo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/'
  })

  // Build Wahoo OAuth authorization URL
  const authUrl = new URL('https://api.wahooligan.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set(
    'scope',
    'user_read user_write email workouts_read workouts_write plans_read plans_write routes_read routes_write power_zones_read power_zones_write offline_data'
  )
  authUrl.searchParams.set('state', state)

  // Redirect to Wahoo authorization page
  return sendRedirect(event, authUrl.toString())
})
