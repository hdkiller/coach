import { getServerSession } from '../utils/session'
import { generateWsToken } from '../utils/ws-auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.id) {
    console.error('[WS Token] Unauthorized - Session:', session)
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const token = generateWsToken(session.user.id)
  return { token }
})
