import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { buildWorkoutTemplateFolderTree } from '../../../utils/workout-template-folders'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id

  const [folders, templates] = await Promise.all([
    (prisma as any).workoutTemplateFolder.findMany({
      where: { userId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }]
    }),
    (prisma as any).workoutTemplate.findMany({
      where: { userId },
      select: { id: true, folderId: true }
    })
  ])

  const directCounts = templates.reduce(
    (acc: Record<string, number>, template: { folderId: string | null }) => {
      if (template.folderId) {
        acc[template.folderId] = (acc[template.folderId] || 0) + 1
      }

      return acc
    },
    {}
  )

  const { tree, flat } = buildWorkoutTemplateFolderTree(folders, directCounts)
  const unfiledCount = templates.filter(
    (template: { folderId: string | null }) => !template.folderId
  ).length

  return {
    tree,
    flat,
    counts: {
      total: templates.length,
      unfiled: unfiledCount
    }
  }
})
