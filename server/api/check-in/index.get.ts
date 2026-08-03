import { requireAuth } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, [])

  try {
    const checkIns = await prisma.checkIn.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return {
      status: 'success',
      data: checkIns
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch check-ins'
    })
  }
})
