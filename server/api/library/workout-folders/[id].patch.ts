import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'
import { isWorkoutTemplateFolderDescendant } from '../../../utils/workout-template-folders'

const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  parentId: z.string().nullable().optional(),
  beforeId: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing folder ID' })
  }

  const validation = updateFolderSchema.safeParse(await readBody(event))
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const userId = session.user.id
  const { name, parentId, beforeId } = validation.data

  const existing = await (prisma as any).workoutTemplateFolder.findFirst({
    where: { id, userId }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const allFolders = await (prisma as any).workoutTemplateFolder.findMany({
    where: { userId },
    select: { id: true, parentId: true }
  })

  if (
    parentId === id ||
    (parentId && isWorkoutTemplateFolderDescendant(parentId, id, allFolders))
  ) {
    throw createError({
      statusCode: 400,
      message: 'Cannot move a folder into itself or its descendant'
    })
  }

  if (parentId) {
    const parent = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: parentId, userId }
    })

    if (!parent) {
      throw createError({ statusCode: 404, message: 'Target parent folder not found' })
    }
  }

  if (beforeId) {
    const beforeFolder = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: beforeId, userId }
    })

    if (!beforeFolder) {
      throw createError({ statusCode: 404, message: 'Target sibling folder not found' })
    }

    if ((beforeFolder.parentId || null) !== (parentId ?? existing.parentId ?? null)) {
      throw createError({ statusCode: 400, message: 'Target sibling must share the target parent' })
    }
  }

  const nextParentId = parentId === undefined ? existing.parentId : parentId

  const updated = await prisma.$transaction(async (tx) => {
    await (tx as any).workoutTemplateFolder.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(parentId !== undefined ? { parentId: nextParentId } : {})
      }
    })

    const siblings = await (tx as any).workoutTemplateFolder.findMany({
      where: {
        userId,
        parentId: nextParentId
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })

    const ordered = siblings.filter((folder: { id: string }) => folder.id !== existing.id)
    const insertIndex = beforeId
      ? Math.max(
          0,
          ordered.findIndex((folder: { id: string }) => folder.id === beforeId)
        )
      : ordered.length

    ordered.splice(insertIndex, 0, {
      ...existing,
      ...(name !== undefined ? { name } : {}),
      parentId: nextParentId
    })

    await Promise.all(
      ordered.map((folder: { id: string }, index: number) =>
        (tx as any).workoutTemplateFolder.update({
          where: { id: folder.id },
          data: { order: index }
        })
      )
    )

    const previousSiblings = await (tx as any).workoutTemplateFolder.findMany({
      where: {
        userId,
        parentId: existing.parentId
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })

    await Promise.all(
      previousSiblings
        .filter((folder: { id: string }) => folder.id !== existing.id)
        .map((folder: { id: string }, index: number) =>
          (tx as any).workoutTemplateFolder.update({
            where: { id: folder.id },
            data: { order: index }
          })
        )
    )

    return (tx as any).workoutTemplateFolder.findFirst({
      where: { id: existing.id, userId }
    })
  })

  return updated
})
