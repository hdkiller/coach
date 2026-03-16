import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { UserUniverseCollector } from '../../utils/data-management/collector'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const collector = new UserUniverseCollector(prisma, user.id)
  const bundle = await collector.bundle()

  // Set headers for file download
  const filename = `watts_export_${user.email.replace(/[@.]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`

  setHeaders(event, {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  return bundle
})
