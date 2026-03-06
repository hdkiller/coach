import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Ultrahuman callback',
    description: 'Handles the OAuth callback from Ultrahuman.',
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
    console.error('Ultrahuman OAuth error:', error)
    return sendRedirect(event, '/settings?ultrahuman_error=' + encodeURIComponent(error))
  }

  // Verify state parameter for CSRF protection
  const storedState = getCookie(event, 'ultrahuman_oauth_state')
  if (!state || !storedState || state !== storedState) {
    console.error('Ultrahuman OAuth state mismatch')
    deleteCookie(event, 'ultrahuman_oauth_state')
    return sendRedirect(event, '/settings?ultrahuman_error=invalid_state')
  }

  deleteCookie(event, 'ultrahuman_oauth_state')

  if (!code) {
    return sendRedirect(event, '/settings?ultrahuman_error=no_code')
  }

  try {
    const config = useRuntimeConfig()
    const clientId = process.env.ULTRAHUMAN_CLIENT_ID
    const clientSecret = process.env.ULTRAHUMAN_CLIENT_SECRET
    const redirectUri = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/ultrahuman/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Ultrahuman credentials not configured')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://vision.ultrahuman.com/m7/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }).toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Ultrahuman token exchange failed:', errorText)
      throw new Error('Failed to exchange authorization code')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Check if integration already exists
    const existing = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'ultrahuman'
      }
    })

    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          accessToken,
          refreshToken,
          expiresAt,
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS'
        }
      })
    } else {
      await prisma.integration.create({
        data: {
          userId: user.id,
          provider: 'ultrahuman',
          accessToken,
          refreshToken,
          expiresAt,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          ingestWorkouts: false // Ultrahuman is primarily wellness
        }
      })
    }

    return sendRedirect(event, '/settings/apps?ultrahuman_success=true')
  } catch (error: any) {
    console.error('Failed to connect Ultrahuman:', error)
    return sendRedirect(
      event,
      '/settings/apps?ultrahuman_error=' + encodeURIComponent(error.message || 'connection_failed')
    )
  }
})
