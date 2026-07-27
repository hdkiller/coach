import { dispatchTask } from '../../../utils/task-dispatcher'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { refreshGarminIntegrationPermissions } from '../../../utils/garmin'

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

  const { code, error: garminError } = getQuery(event)
  const verifier = getCookie(event, 'garmin_code_verifier')

  if (garminError) {
    console.error('[GarminCallback] Garmin returned authorization error:', garminError)
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=access-denied')
  }

  if (!code || !verifier) {
    console.warn('[GarminCallback] Missing code or verifier cookie', {
      hasCode: !!code,
      hasVerifier: !!verifier
    })
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=missing-verifier')
  }

  const clientId = process.env.GARMIN_CLIENT_ID
  const clientSecret = process.env.GARMIN_CLIENT_SECRET
  const config = useRuntimeConfig()
  const siteUrl = (config.public.siteUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const redirectUri = `${siteUrl}/api/integrations/garmin/callback`

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
    }).toString()
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[GarminCallback] Token exchange failed', errorData)
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=token-exchange-failed')
  }

  const tokenData = await response.json()

  // Fetch Garmin User ID to identify the account
  const userResponse = await fetch('https://apis.garmin.com/wellness-api/rest/user/id', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  if (!userResponse.ok) {
    console.error('[GarminCallback] Failed to fetch Garmin user profile', {
      status: userResponse.status
    })
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=profile-fetch-failed')
  }

  const userData = await userResponse.json()
  const externalUserId = userData.userId as string | undefined

  if (!externalUserId) {
    console.error('[GarminCallback] Garmin user profile missing externalUserId')
    deleteCookie(event, 'garmin_code_verifier')
    return sendRedirect(event, '/settings/apps?garmin_error=profile-fetch-failed')
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

  const integration = await prisma.integration.upsert({
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

  // Best-effort: merge export permissions (HEALTH_EXPORT, WORKOUT_IMPORT, …) into scope.
  await refreshGarminIntegrationPermissions(integration)

  // Start historical backfill after a short delay via Trigger.dev
  // We use a delay to ensure Garmin's Push API registration is fully propagated
  // to avoid "User not registered with consumer" (403) errors.
  try {
    await dispatchTask(
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
