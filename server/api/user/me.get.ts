import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { getUserEntitlements } from '../../utils/entitlements'
import { getActivePromotionalGrant } from '../../utils/partner-campaigns'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true,
      trialEndsAt: true,
      shareRewardClaimedAt: true,
      shareRewardDaysGranted: true,
      nutritionTrackingEnabled: true,
      dashboardSettings: true,
      isAdmin: true,
      language: true,
      uiLanguage: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const activePromotionalGrant = await getActivePromotionalGrant(userId)
  const entitlements = getUserEntitlements({
    ...user,
    promotionalGrantTier: activePromotionalGrant?.tier ?? null
  })

  return {
    ...user,
    entitlements,
    activePromotionalGrant: activePromotionalGrant
      ? {
          tier: activePromotionalGrant.tier,
          endsAt: activePromotionalGrant.endsAt.toISOString(),
          campaignSlug: activePromotionalGrant.campaignSlug,
          partnerName: activePromotionalGrant.partnerName,
          campaignName: activePromotionalGrant.campaignName
        }
      : null
  }
})
