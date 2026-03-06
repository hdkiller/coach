import { getServerSession } from '../../../utils/session'
import { randomBytes } from 'node:crypto'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Ultrahuman authorize',
    description: 'Redirects the user to Ultrahuman for OAuth authorization.',
    responses: {
      302: { description: 'Redirect to Ultrahuman' },
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
  const clientId = process.env.ULTRAHUMAN_CLIENT_ID
  const redirectUri = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/ultrahuman/callback`

  if (!clientId) {
    throw new Error('Ultrahuman Client ID not configured')
  }

  // Generate a random state for CSRF protection
  const state = randomBytes(16).toString('hex')
  setCookie(event, 'ultrahuman_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600 // 10 minutes
  })

  const scopes = ['read:daily', 'read:profile']

  const authUrl = new URL('https://vision.ultrahuman.com/m7/v1/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('state', state)

  return sendRedirect(event, authUrl.toString())
})
