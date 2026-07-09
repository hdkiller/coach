import { randomUUID } from 'node:crypto'
import { createError, readBody, setCookie } from 'h3'
import { prisma } from '../../utils/db'

function assertE2eMode() {
  if (process.env.E2E_MODE !== 'true') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
}

export default defineEventHandler(async (event) => {
  assertE2eMode()

  const body = await readBody<{ email?: string }>(event).catch(() => ({}))
  const email = body.email ?? process.env.E2E_TEST_USER_EMAIL ?? 'e2e-athlete@coachwatts.test'

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user || user.deactivatedAt) {
    throw createError({
      statusCode: 404,
      statusMessage: `E2E user not found: ${email}. Run pnpm e2e:db:prepare.`
    })
  }

  const sessionToken = randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires
    }
  })

  setCookie(event, 'next-auth.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires
  })

  return {
    ok: true,
    userId: user.id,
    email: user.email
  }
})
