import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing folder ID' })
  }

  const context = getLibraryAccessContext(session.user)
  const scope = parseLibraryScope(getQuery(event).scope, context.isCoaching ? 'all' : 'athlete')

  const existing = await (prisma as any).workoutTemplateFolder.findFirst({
    where: { id, userId: { in: getReadableLibraryOwnerIds(context, scope) } }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const ownerUserId = existing.userId
  await prisma.$transaction(async (tx) => {
    await (tx as any).workoutTemplate.updateMany({
      where: { userId: ownerUserId, folderId: id },
      data: { folderId: null }
    })

    await (tx as any).workoutTemplateFolder.updateMany({
      where: { userId: ownerUserId, parentId: id },
      data: { parentId: existing.parentId }
    })

    await (tx as any).workoutTemplateFolder.delete({
      where: { id: existing.id }
    })

    const siblings = await (tx as any).workoutTemplateFolder.findMany({
      where: {
        userId: ownerUserId,
        parentId: existing.parentId
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })

    await Promise.all(
      siblings.map((folder: { id: string }, index: number) =>
        (tx as any).workoutTemplateFolder.update({
          where: { id: folder.id },
          data: { order: index }
        })
      )
    )
  })

  return { success: true }
})
