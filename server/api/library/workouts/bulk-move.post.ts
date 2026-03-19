import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const bulkMoveSchema = z.object({
  templateIds: z.array(z.string()).min(1),
  folderId: z.string().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const validation = bulkMoveSchema.safeParse(await readBody(event))
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const userId = session.user.id
  const { templateIds, folderId } = validation.data

  if (folderId) {
    const folder = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: folderId, userId }
    })

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
  }

  await (prisma as any).workoutTemplate.updateMany({
    where: {
      userId,
      id: {
        in: templateIds
      }
    },
    data: {
      folderId
    }
  })

  return { success: true }
})
