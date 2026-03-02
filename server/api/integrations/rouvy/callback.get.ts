import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'ROUVY callback',
    description: 'Handles the OAuth callback from ROUVY.',
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
    console.error('ROUVY OAuth error:', error)
    return sendRedirect(event, '/settings?rouvy_error=' + encodeURIComponent(error))
  }

  const storedState = getCookie(event, 'rouvy_oauth_state')
  if (!state || !storedState || state !== storedState) {
    console.error('ROUVY OAuth state mismatch')
    deleteCookie(event, 'rouvy_oauth_state')
    return sendRedirect(event, '/settings?rouvy_error=invalid_state')
  }

  deleteCookie(event, 'rouvy_oauth_state')

  if (!code) {
    return sendRedirect(event, '/settings?rouvy_error=no_code')
  }

  try {
    const clientId = process.env.ROUVY_CLIENT_ID
    const clientSecret = process.env.ROUVY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('ROUVY credentials not configured')
    }

    const config = useRuntimeConfig()
    const redirectUri = `${config.public.siteUrl || 'http://localhost:3000'}/api/integrations/rouvy/callback`

    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    formData.append('code', code)
    formData.append('grant_type', 'authorization_code')
    formData.append('redirect_uri', redirectUri)

    const tokenResponse = await fetch('https://api.rouvy.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('ROUVY token exchange failed:', errorText)
      throw new Error('Failed to exchange authorization code')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token

    // Robust expiresAt calculation
    let expiresAt: Date
    if (tokenData.expires_at) {
      expiresAt = new Date(tokenData.expires_at * 1000)
    } else if (tokenData.expires_in) {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    } else {
      // Default to 1 hour if both missing
      expiresAt = new Date(Date.now() + 3600 * 1000)
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Since ROUVY doesn't return athlete ID in token response (based on docs provided),
    // we might need to fetch it separately if available, or just use the integration ID.
    // The docs don't show a "get athlete" endpoint, but they have /activities.
    // I'll skip externalUserId for now or fetch it if I find an endpoint.

    const existing = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'rouvy'
      }
    })

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
          provider: 'rouvy',
          accessToken,
          refreshToken,
          expiresAt,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          ingestWorkouts: true // Enable by default
        }
      })
    }

    return sendRedirect(event, '/settings?rouvy_success=true')
  } catch (error: any) {
    console.error('Failed to connect ROUVY:', error)
    return sendRedirect(
      event,
      '/settings?rouvy_error=' + encodeURIComponent(error.message || 'connection_failed')
    )
  }
})
