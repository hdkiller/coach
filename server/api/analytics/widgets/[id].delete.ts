import { requireAuth } from '../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const widget = await prisma.widget.findFirst({
    where: {
      id,
      ownerId: user.id
    }
  })

  if (!widget) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Widget not found'
    })
  }

  return await prisma.widget.delete({
    where: { id }
  })
})
