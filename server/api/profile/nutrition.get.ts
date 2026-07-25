import { requireAuth } from '../../utils/auth-guard'
import { getUserNutritionSettings } from '../../utils/nutrition/settings'
import { prisma } from '../../utils/db'
import { bodyMetricResolver } from '../../utils/services/bodyMetricResolver'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get nutrition settings',
    description:
      'Returns the authenticated user’s nutrition calibration settings and effective weight.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Nutrition settings' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:read'])
  const userId = user.id

  const [settings, dbUser] = await Promise.all([
    getUserNutritionSettings(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { weight: true, weightSourceMode: true, nutritionTrackingEnabled: true }
    })
  ])
  const effectiveWeight = await bodyMetricResolver.resolveEffectiveWeight(userId, {
    weight: dbUser?.weight,
    weightSourceMode: dbUser?.weightSourceMode
  })

  return {
    settings: {
      ...settings,
      nutritionTrackingEnabled: dbUser?.nutritionTrackingEnabled ?? false,
      user: {
        weight: effectiveWeight.value || 75
      }
    }
  }
})
