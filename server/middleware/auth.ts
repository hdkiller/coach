import { createError, defineEventHandler, deleteCookie, getCookie, sendRedirect } from 'h3'
import { prisma } from '../utils/db'

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token'
] as const

const DEACTIVATED_LOGIN_PATH = '/login?error=deactivated'

function clearSessionCookies(event: Parameters<typeof deleteCookie>[0]) {
  for (const name of SESSION_COOKIE_NAMES) {
    deleteCookie(event, name, { path: '/' })
  }
}

/**
 * Rejects deactivated accounts at the edge: invalidate DB sessions + cookies,
 * then 401 API callers or redirect browsers to sign-in with a deactivated message.
 */
export default defineEventHandler(async (event) => {
  const path = event.path || ''

  if (
    path.startsWith('/_') ||
    path.startsWith('/api/auth') ||
    /\.(js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|map)(\?|$)/i.test(path)
  ) {
    return
  }

  const sessionToken =
    getCookie(event, 'next-auth.session-token') ||
    getCookie(event, '__Secure-next-auth.session-token')

  if (!sessionToken) {
    return
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: {
      userId: true,
      user: {
        select: {
          deactivatedAt: true
        }
      }
    }
  })

  if (!session?.user?.deactivatedAt) {
    return
  }

  await prisma.session.deleteMany({
    where: { userId: session.userId }
  })

  clearSessionCookies(event)

  if (path.startsWith('/api/')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Account deactivated'
    })
  }

  // Avoid redirect loops on the sign-in page itself.
  if (path === '/login' || path.startsWith('/login?')) {
    return
  }

  return sendRedirect(event, DEACTIVATED_LOGIN_PATH, 302)
})
