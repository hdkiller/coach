import { getServerSession } from '../../../utils/session'
import { subscribeWithingsWebhooks } from '../../../utils/withings-notifications'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Withings callback',
    description: 'Handles the OAuth callback from Withings.',
    inputSchema: [
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
    console.error('Withings OAuth error:', error)
    return sendRedirect(event, '/settings?withings_error=' + encodeURIComponent(error))
  }

  // Verify state parameter for CSRF protection
  const storedState = getCookie(event, 'withings_oauth_state')
  if (!state || !storedState || state !== storedState) {
    console.error('Withings OAuth state mismatch')
    deleteCookie(event, 'withings_oauth_state')
    return sendRedirect(event, '/settings?withings_error=invalid_state')
  }

  // Clear the state cookie after validation
  deleteCookie(event, 'withings_oauth_state')

  if (!code) {
    return sendRedirect(event, '/settings?withings_error=no_code')
  }

  try {
    const config = useRuntimeConfig()
    const clientId = process.env.WITHINGS_CLIENT_ID
    const clientSecret = process.env.WITHINGS_CLIENT_SECRET
    const redirectUri = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/withings/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Withings credentials not configured')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://wbsapi.withings.net/v2/oauth2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      }).toString()
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.status !== 0) {
      console.error('Withings token exchange failed:', tokenData)
      throw new Error(`Failed to exchange authorization code: Status ${tokenData.status}`)
    }

    const { access_token, refresh_token, expires_in, userid } = tokenData.body

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
        provider: 'withings'
      }
    })

    const expiresAt = new Date(Date.now() + expires_in * 1000)

    if (existing) {
      // Update existing integration
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          externalUserId: userid.toString(),
          expiresAt,
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS'
        }
      })
    } else {
      // Create new integration
      await prisma.integration.create({
        data: {
          userId: user.id,
          provider: 'withings',
          accessToken: access_token,
          refreshToken: refresh_token,
          externalUserId: userid.toString(),
          expiresAt,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          ingestWorkouts: true
        }
      })
    }

    try {
      const webhookUrl = `${config.public.siteUrl || 'http://localhost:3099'}/api/integrations/withings/webhook`
      const subscriptionResult = await subscribeWithingsWebhooks(access_token, webhookUrl)

      if (subscriptionResult.subscribed.length > 0) {
        console.log(
          '[Withings Callback] Subscribed to notifications:',
          subscriptionResult.subscribed
        )
      }

      if (subscriptionResult.failed.length > 0) {
        console.warn(
          '[Withings Callback] Some webhook subscriptions failed:',
          subscriptionResult.failed
        )
      }
    } catch (subError) {
      console.error('[Withings Callback] Failed to subscribe to notifications:', subError)
    }

    // Redirect back to settings with success message
    return sendRedirect(event, '/settings?withings_success=true')
  } catch (error: any) {
    console.error('Failed to connect Withings:', error)
    return sendRedirect(
      event,
      '/settings?withings_error=' + encodeURIComponent(error.message || 'connection_failed')
    )
  }
})
