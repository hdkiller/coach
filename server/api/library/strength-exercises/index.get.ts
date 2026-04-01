import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import {
  annotateLibraryOwner,
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const context = getLibraryAccessContext(session.user)
  const query = getQuery(event)
  const scope = parseLibraryScope(query.scope, context.isCoaching ? 'coach' : 'athlete')
  const ownerIds = getReadableLibraryOwnerIds(context, scope)
  const q = String(query.q || '').trim()

  const items = await (prisma as any).strengthExerciseLibraryItem.findMany({
    where: {
      userId: { in: ownerIds },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { notes: { contains: q, mode: 'insensitive' } },
              { movementPattern: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    take: 50
  })

  return items.map((item: any) => annotateLibraryOwner(context, item))
})
