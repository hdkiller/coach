import { defineEventHandler, sendRedirect, setCookie, createError } from 'h3'
import crypto from 'uncrypto'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const clientId = process.env.ROUVY_CLIENT_ID
  const redirectUri = `${config.public.siteUrl || 'http://localhost:3000'}/api/integrations/rouvy/callback`

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'ROUVY client ID not configured'
    })
  }

  // Generate a random state to prevent CSRF
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Store state in a cookie for validation in callback
  setCookie(event, 'rouvy_oauth_state', state, {
    maxAge: 600, // 10 minutes
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })

  // Build ROUVY OAuth authorization URL
  const authUrl = new URL('https://api.rouvy.com/oauth/authorize')
  authUrl.searchParams.set('clientId', clientId)
  authUrl.searchParams.set('redirectUri', redirectUri)
  authUrl.searchParams.set('responseType', 'code')
  authUrl.searchParams.set('state', state)

  // Redirect to ROUVY authorization page
  return sendRedirect(event, authUrl.toString())
})
