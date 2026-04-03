import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { getLibraryAccessContext, getReadableLibraryOwnerIds } from '../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing exercise ID' })
  }

  const context = getLibraryAccessContext(session.user)
  const existing = await (prisma as any).strengthExerciseLibraryItem.findFirst({
    where: {
      id,
      userId: { in: getReadableLibraryOwnerIds(context, context.isCoaching ? 'all' : 'athlete') }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Saved strength exercise not found' })
  }

  await (prisma as any).strengthExerciseLibraryItem.delete({ where: { id } })

  return { success: true }
})
