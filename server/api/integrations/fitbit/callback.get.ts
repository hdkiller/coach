import { getServerSession } from '../../../utils/session'
import { subscribeFitbitWebhooks } from '../../../utils/fitbit-subscriptions'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Fitbit callback',
    description: 'Handles the OAuth callback from Fitbit.',
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
    console.error('Fitbit OAuth error:', error)
    return sendRedirect(event, '/settings?fitbit_error=' + encodeURIComponent(error))
  }

  const storedState = getCookie(event, 'fitbit_oauth_state')
  if (!state || !storedState || state !== storedState) {
    console.error('Fitbit OAuth state mismatch')
    deleteCookie(event, 'fitbit_oauth_state')
    return sendRedirect(event, '/settings?fitbit_error=invalid_state')
  }

  deleteCookie(event, 'fitbit_oauth_state')

  if (!code) {
    return sendRedirect(event, '/settings?fitbit_error=no_code')
  }

  try {
    const config = useRuntimeConfig()
    const rawClientId = process.env.FITBIT_CLIENT_ID
    const rawClientSecret = process.env.FITBIT_CLIENT_SECRET
    const siteUrl = (config.public.siteUrl || 'http://localhost:3099').replace(/\/$/, '')
    const clientId = rawClientId?.replace(/^"|"$/g, '')
    const clientSecret = rawClientSecret?.replace(/^"|"$/g, '')
    const redirectUri = `${siteUrl}/api/integrations/fitbit/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Fitbit credentials not configured')
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId
      }).toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Fitbit token exchange failed:', errorText)
      throw new Error('Failed to exchange authorization code')
    }

    const tokenData = await tokenResponse.json()

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in
    const scope = tokenData.scope
    const externalUserId = tokenData.user_id

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
        provider: 'fitbit'
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
          scope,
          externalUserId: externalUserId ? String(externalUserId) : null,
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS'
        }
      })
    } else {
      await prisma.integration.create({
        data: {
          userId: user.id,
          provider: 'fitbit',
          accessToken,
          refreshToken,
          expiresAt,
          scope,
          externalUserId: externalUserId ? String(externalUserId) : null,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date()
        }
      })
    }

    try {
      const subscriptionResult = await subscribeFitbitWebhooks(accessToken)
      console.log('[Fitbit Callback] Webhook subscriptions:', subscriptionResult)
      if (subscriptionResult.failed.length > 0) {
        console.warn(
          '[Fitbit Callback] Some webhook subscriptions failed:',
          subscriptionResult.failed
        )
      }
    } catch (subscriptionError) {
      console.error(
        '[Fitbit Callback] Failed to register Fitbit webhook subscriptions:',
        subscriptionError
      )
    }

    return sendRedirect(event, '/settings?fitbit_success=true')
  } catch (error: any) {
    console.error('Failed to connect Fitbit:', error)
    return sendRedirect(
      event,
      '/settings?fitbit_error=' + encodeURIComponent(error.message || 'connection_failed')
    )
  }
})
