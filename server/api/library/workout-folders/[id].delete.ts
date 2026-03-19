import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing folder ID' })
  }

  const userId = session.user.id

  const existing = await (prisma as any).workoutTemplateFolder.findFirst({
    where: { id, userId }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  await prisma.$transaction(async (tx) => {
    await (tx as any).workoutTemplate.updateMany({
      where: { userId, folderId: id },
      data: { folderId: null }
    })

    await (tx as any).workoutTemplateFolder.updateMany({
      where: { userId, parentId: id },
      data: { parentId: existing.parentId }
    })

    await (tx as any).workoutTemplateFolder.delete({
      where: { id: existing.id }
    })

    const siblings = await (tx as any).workoutTemplateFolder.findMany({
      where: {
        userId,
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
