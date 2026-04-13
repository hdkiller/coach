import { tasks } from '@trigger.dev/sdk/v3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { GarminService } from '../../../utils/services/garminService'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Garmin Callback',
    description: 'OAuth2 callback handler for Garmin Connect integration.',
    responses: {
      302: { description: 'Redirect to settings' },
      400: { description: 'Bad request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { code } = getQuery(event)
  const verifier = getCookie(event, 'garmin_code_verifier')

  if (!code || !verifier)
    throw createError({ statusCode: 400, message: 'Missing code or verifier' })

  const clientId = process.env.GARMIN_CLIENT_ID
  const clientSecret = process.env.GARMIN_CLIENT_SECRET
  const config = useRuntimeConfig()
  const redirectUri = `${config.public.siteUrl}/api/integrations/garmin/callback`

  const response = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: redirectUri,
      client_id: clientId!,
      client_secret: clientSecret!,
      code_verifier: verifier
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[GarminCallback] Token exchange failed', errorData)
    throw createError({ statusCode: 400, message: 'Failed to exchange code for token' })
  }

  const tokenData = await response.json()

  // Fetch Garmin User ID to identify the account
  const userResponse = await fetch('https://apis.garmin.com/wellness-api/rest/user/id', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  if (!userResponse.ok) {
    throw createError({ statusCode: 400, message: 'Failed to fetch Garmin user profile' })
  }

  const userData = await userResponse.json()
  const externalUserId = userData.userId as string | undefined

  if (!externalUserId) {
    throw createError({ statusCode: 400, message: 'Failed to fetch Garmin user profile' })
  }

  const existingOwner = await prisma.integration.findFirst({
    where: {
      provider: 'garmin',
      externalUserId,
      NOT: {
        userId: session.user.id
      }
    },
    select: {
      userId: true
    }
  })

  if (existingOwner) {
    console.error('[GarminCallback] Garmin account already connected to another user', {
      externalUserId,
      currentUserId: session.user.id,
      existingOwnerUserId: existingOwner.userId
    })
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=account-already-linked')
  }

  await prisma.integration.upsert({
    where: { userId_provider: { userId: session.user.id, provider: 'garmin' } },
    create: {
      userId: session.user.id,
      provider: 'garmin',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      externalUserId,
      scope: tokenData.scope || null,
      ingestWorkouts: true,
      syncStatus: 'SUCCESS',
      errorMessage: null
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      externalUserId,
      scope: tokenData.scope || null,
      ingestWorkouts: true,
      syncStatus: 'SUCCESS',
      errorMessage: null
    }
  })

  // Start historical backfill after a short delay via Trigger.dev
  // We use a delay to ensure Garmin's Push API registration is fully propagated
  // to avoid "User not registered with consumer" (403) errors.
  try {
    await tasks.trigger(
      'garmin-backfill',
      { userId: session.user.id, delaySeconds: 30 },
      {
        concurrencyKey: session.user.id,
        tags: [`user:${session.user.id}`],
        idempotencyKey: `garmin-backfill:${session.user.id}`,
        idempotencyKeyTTL: '1h'
      }
    )
    console.log(`[GarminCallback] Queued garmin-backfill for user ${session.user.id}`)
  } catch (e) {
    console.error('[GarminCallback] Failed to trigger backfill task', e)
  }

  // Clear cookie
  deleteCookie(event, 'garmin_code_verifier')

  return sendRedirect(event, '/settings/apps?garmin_success=true')
})
