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
      subscriptionTier: true,
      shareRewardClaimedAt: true
    }
  })

  if (!user) {
    return { message: null }
  }

  const targetedGrowthTypes = new Set(['ADVERT', 'SHARE'])
  let selectedMessage = null

  const userAgeMs = new Date().getTime() - user.createdAt.getTime()

  for (const msg of activeMessages) {
    const minAgeMs = (msg.minUserAgeDays || 0) * 24 * 60 * 60 * 1000
    const isTargetedGrowthType = targetedGrowthTypes.has(msg.type)

    if (isTargetedGrowthType) {
      if (user.subscriptionTier !== 'FREE') {
        continue
      }

      if (userAgeMs < minAgeMs) {
        continue
      }

      if (msg.type === 'SHARE' && user.shareRewardClaimedAt) {
        continue
      }

      selectedMessage = msg
      break
    } else {
      if (userAgeMs < minAgeMs) {
        continue
      }

      selectedMessage = msg
      break
    }
  }

  return { message: selectedMessage }
})
