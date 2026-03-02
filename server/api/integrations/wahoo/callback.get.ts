import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { fetchWahooUser } from '../../../utils/wahoo'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Wahoo callback',
    description: 'Handles the OAuth callback from Wahoo.',
    parameters: [
      { name: 'code', in: 'query', schema: { type: 'string' } },
      { name: 'state', in: 'query', schema: { type: 'string' } },
      { name: 'error', in: 'query', schema: { type: 'string' } }
    ],
    responses: {
      302: { description: 'Redirect to settings' },
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

  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string
  const error = query.error as string

  if (error) {
    console.error('[Wahoo] OAuth error:', error)
    return sendRedirect(event, '/settings?wahoo_error=' + encodeURIComponent(error))
  }

  const storedState = getCookie(event, 'wahoo_oauth_state')
  if (!state || !storedState || state !== storedState) {
    console.error('[Wahoo] OAuth state mismatch')
    deleteCookie(event, 'wahoo_oauth_state')
    return sendRedirect(event, '/settings?wahoo_error=invalid_state')
  }

  deleteCookie(event, 'wahoo_oauth_state')

  if (!code) {
    return sendRedirect(event, '/settings?wahoo_error=no_code')
  }

  try {
    const clientId = process.env.WAHOO_CLIENT_ID
    const clientSecret = process.env.WAHOO_CLIENT_SECRET
    const config = useRuntimeConfig()
    const redirectUri = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/wahoo/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Wahoo credentials not configured')
    }

    const tokenResponse = await fetch('https://api.wahooligan.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Wahoo] Token exchange failed:', errorText)
      throw new Error('Failed to exchange authorization code')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Fetch Wahoo user to get the external ID
    const wahooUser = await fetchWahooUser(accessToken)
    const externalUserId = String(wahooUser.id)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    const existing = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'wahoo'
      }
    })

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          accessToken,
          refreshToken,
          externalUserId,
          expiresAt,
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS',
          errorMessage: null
        }
      })
    } else {
      await prisma.integration.create({
        data: {
          userId: user.id,
          provider: 'wahoo',
          accessToken,
          refreshToken,
          externalUserId,
          expiresAt,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          ingestWorkouts: true
        }
      })
    }

    return sendRedirect(event, '/settings?wahoo_success=true')
  } catch (error: any) {
    console.error('[Wahoo] Failed to connect:', error)
    return sendRedirect(
      event,
      '/settings?wahoo_error=' + encodeURIComponent(error.message || 'connection_failed')
    )
  }
})
