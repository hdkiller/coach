import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id

  const activeMessages = await prisma.systemMessage.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      dismissals: {
        none: {
          userId: userId
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5 // Fetch a few candidates in case the latest is filtered out
  })

  // If no messages, return null early
  if (activeMessages.length === 0) {
    return { message: null }
  }

  // Fetch user details needed for filtering
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      subscriptionTier: true
    }
  })

  if (!user) {
    return { message: null }
  }

  let selectedMessage = null

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const userAgeMs = new Date().getTime() - user.createdAt.getTime()

  for (const msg of activeMessages) {
    if (msg.type === 'ADVERT') {
      // Logic for ADVERT type:
      // 1. Don't show to subscribers (PRO or SUPPORTER)
      if (user.subscriptionTier !== 'FREE') {
        continue
      }

      // 2. Don't show to new users (< 7 days old)
      if (userAgeMs < ONE_WEEK_MS) {
        continue
      }

      // If checks pass, show the advert
      selectedMessage = msg
      break
    } else {
      // Non-ADVERT messages are shown normally
      selectedMessage = msg
      break
    }
  }

  return { message: selectedMessage }
})
