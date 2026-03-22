import { requireAuth } from '../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  return await prisma.dashboard.findMany({
    where: { ownerId: user.id },
    include: { widgets: true },
    orderBy: [
      { order: 'asc' },
      { updatedAt: 'desc' }
    ]
  })
})
