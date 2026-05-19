import { prisma } from '../utils/db'

export default defineNitroPlugin(() => {
  const apiKey = process.env.INTERVALS_API_KEY
  const athleteId = process.env.INTERVALS_ATHLETE_ID
  if (!apiKey || !athleteId) return

  setTimeout(async () => {
    try {
      const userCount = await prisma.user.count()
      if (userCount !== 1) {
        console.log(
          `[bootstrap-intervals] Skipping seed: expected exactly 1 user, found ${userCount}.`
        )
        return
      }

      const user = await prisma.user.findFirstOrThrow({ select: { id: true } })
      const existing = await prisma.integration.findUnique({
        where: { userId_provider: { userId: user.id, provider: 'intervals' } }
      })
      if (existing) return

      await prisma.integration.create({
        data: {
          userId: user.id,
          provider: 'intervals',
          accessToken: apiKey,
          externalUserId: athleteId,
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          initialSyncCompleted: false,
          ingestWorkouts: true
        }
      })
      console.log(`[bootstrap-intervals] Seeded Intervals.icu integration for user ${user.id}.`)
    } catch (error) {
      console.error('[bootstrap-intervals] Failed to seed Intervals.icu integration:', error)
    }
  }, 0)
})
