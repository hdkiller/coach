import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Disconnect Liftosaur',
    description: "Removes the current user's Liftosaur credentials and stops future syncs.",
    responses: {
      200: { description: 'Disconnected successfully' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  await prisma.integration.deleteMany({
    where: {
      userId: session.user.id,
      provider: 'liftosaur'
    }
  })

  return { success: true }
})
