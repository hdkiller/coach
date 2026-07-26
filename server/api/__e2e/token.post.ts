import { z } from 'zod'
import { createError, readBody } from 'h3'
import { prisma } from '../../utils/db'
import { assertE2eMode } from '../../utils/e2e-guard'
import { oauthRepository } from '../../utils/repositories/oauthRepository'

/** Default companion scopes for E2E Bearer tokens. */
export const E2E_DEFAULT_SCOPES = [
  'profile:read',
  'profile:write',
  'workout:read',
  'workout:write',
  'health:read',
  'health:write',
  'recommendation:read',
  'chat:read',
  'chat:write',
  'offline_access'
] as const

const E2E_MOBILE_CLIENT_ID =
  process.env.E2E_MOBILE_CLIENT_ID ?? 'e2e00000-0000-4000-8000-000000000001'

export default defineEventHandler(async (event) => {
  assertE2eMode()

  const body = await readBody<{
    email?: string
    scopes?: string[]
    clientId?: string
  }>(event).catch(
    (): {
      email?: string
      scopes?: string[]
      clientId?: string
    } => ({})
  )

  const email = body.email ?? process.env.E2E_TEST_USER_EMAIL ?? 'e2e-athlete@coachwatts.test'
  const clientId = body.clientId ?? E2E_MOBILE_CLIENT_ID
  const scopes = body.scopes?.length ? body.scopes : [...E2E_DEFAULT_SCOPES]

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user || user.deactivatedAt) {
    throw createError({
      statusCode: 404,
      statusMessage: `E2E user not found: ${email}. Run pnpm e2e:db:prepare.`
    })
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId }
  })

  if (!app) {
    throw createError({
      statusCode: 404,
      statusMessage: `E2E OAuth app not found: ${clientId}. Run pnpm e2e:db:prepare.`
    })
  }

  const token = await oauthRepository.createToken({
    appId: app.id,
    userId: user.id,
    scopes,
    includeRefreshToken: true
  })

  return {
    access_token: token.accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: token.refreshToken,
    scope: scopes.join(' '),
    userId: user.id,
    email: user.email,
    clientId: app.clientId
  }
})
