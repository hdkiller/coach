import { requireAuth } from '../../../utils/auth-guard'
import { decodeDashboardLayout } from '../../../utils/analyticsDashboardLayout'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const dashboards = await prisma.dashboard.findMany({
    where: { ownerId: user.id },
    include: { widgets: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
  })

  return dashboards.map((dashboard) => {
    const decoded = decodeDashboardLayout(dashboard.layout)
    return {
      ...dashboard,
      layout: decoded.layout,
      scope: decoded.scope,
      dateRange: decoded.dateRange
    }
  })
})
