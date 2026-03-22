import { requireAuth } from '../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  return await prisma.widget.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' }
  })
})
