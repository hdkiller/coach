import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  groupLibraryItemsByOwner,
  parseLibraryScope
} from '../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const context = getLibraryAccessContext(session.user)
  const scope = parseLibraryScope(getQuery(event).scope, 'athlete')
  const ownerIds = getReadableLibraryOwnerIds(context, scope)

  const templates = await (prisma as any).workoutTemplate.findMany({
    where: { userId: { in: ownerIds } },
    include: {
      folder: {
        select: {
          id: true,
          name: true,
          parentId: true
        }
      }
    },
    orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }]
  })

  if (scope === 'all') {
    return groupLibraryItemsByOwner(context, templates)
  }

  return templates.map((template: any) => ({
    ...template,
    ownerUserId: template.userId,
    ownerScope: scope === 'coach' ? 'coach' : 'athlete'
  }))
})
