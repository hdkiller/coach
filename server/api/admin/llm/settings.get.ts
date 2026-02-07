import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const [tierSettings, overrides] = await Promise.all([
      prisma.llmTierSettings.findMany({
        orderBy: { updatedAt: 'asc' }
      }),
      prisma.llmOperationOverride.findMany({
        orderBy: { operation: 'asc' }
      })
    ])

    // Join in memory to bypass potential Prisma 'include' schema sync issues
    const settings = tierSettings.map((tier) => ({
      ...tier,
      overrides: overrides.filter((o) => o.tierSettingsId === tier.id)
    }))

    return settings
  } catch (error: any) {
    console.error('[Admin] Failed to fetch LLM settings:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})
