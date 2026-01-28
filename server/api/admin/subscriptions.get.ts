import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  // 1. Total Counts by Tier (excluding FREE)
  const tierCounts = await prisma.user.groupBy({
    by: ['subscriptionTier'],
    _count: { id: true },
    where: { subscriptionTier: { not: 'FREE' } }
  })

  // 2. Total Counts by Status (excluding NONE)
  const statusCounts = await prisma.user.groupBy({
    by: ['subscriptionStatus'],
    _count: { id: true },
    where: { subscriptionStatus: { not: 'NONE' } }
  })

  // 3. Recent Premium Users (Last 20)
  const recentPremiumUsers = await prisma.user.findMany({
    where: {
      subscriptionTier: { in: ['SUPPORTER', 'PRO'] }
    },
    orderBy: { createdAt: 'desc' }, // Order by account creation for now, as we don't track sub start date explicitly
    take: 20,
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true,
      createdAt: true
    }
  })

  // 4. Monthly Recurring Revenue (Estimate)
  // Supporter: $8.99, Pro: $14.99
  // Note: This is a rough estimate assuming monthly billing. Annual plans would distort this.
  // Ideally we should check Stripe for real MRR, but this is a good approximation from DB.
  let estimatedMRR = 0

  // Get counts per tier for ACTIVE users only
  const activeTierCounts = await prisma.user.groupBy({
    by: ['subscriptionTier'],
    _count: { id: true },
    where: {
      subscriptionStatus: 'ACTIVE',
      subscriptionTier: { in: ['SUPPORTER', 'PRO'] }
    }
  })

  activeTierCounts.forEach((group) => {
    if (group.subscriptionTier === 'SUPPORTER') {
      estimatedMRR += group._count.id * 8.99
    } else if (group.subscriptionTier === 'PRO') {
      estimatedMRR += group._count.id * 14.99
    }
  })

  return {
    tierCounts,
    statusCounts,
    recentPremiumUsers,
    estimatedMRR,
    activeTierCounts // Return this for detailed breakdown if needed
  }
})
