import { z } from 'zod'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

const DAYS_GRANTED = 3

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const schema = z.object({
    messageId: z.string().optional(),
    network: z.string().optional().nullable()
  })

  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid data' })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      subscriptionTier: true,
      trialEndsAt: true,
      shareRewardClaimedAt: true
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (user.subscriptionTier !== 'FREE') {
    throw createError({ statusCode: 403, statusMessage: 'Only free users can claim this reward' })
  }

  if (user.shareRewardClaimedAt) {
    throw createError({ statusCode: 409, statusMessage: 'Share reward already claimed' })
  }

  const now = new Date()
  const baseTrialDate =
    user.trialEndsAt && new Date(user.trialEndsAt) > now ? new Date(user.trialEndsAt) : now
  const nextTrialEndsAt = new Date(baseTrialDate)
  nextTrialEndsAt.setDate(nextTrialEndsAt.getDate() + DAYS_GRANTED)

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      trialEndsAt: nextTrialEndsAt,
      shareRewardClaimedAt: now,
      shareRewardDaysGranted: DAYS_GRANTED
    },
    select: {
      trialEndsAt: true,
      shareRewardClaimedAt: true,
      shareRewardDaysGranted: true
    }
  })

  return {
    trialEndsAt: updatedUser.trialEndsAt?.toISOString() || nextTrialEndsAt.toISOString(),
    daysGranted: DAYS_GRANTED,
    alreadyClaimed: false
  }
})
