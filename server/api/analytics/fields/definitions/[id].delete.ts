import { requireAuth } from '../../../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const field = await prisma.customFieldDefinition.findFirst({
    where: {
      id,
      ownerId: user.id
    }
  })

  if (!field) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Field definition not found'
    })
  }

  return await prisma.customFieldDefinition.delete({
    where: { id }
  })
})
