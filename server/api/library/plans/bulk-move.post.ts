import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'
import {
  getLibraryAccessContext,
  getWritableLibraryOwnerId,
  parseLibraryScope
} from '../../../utils/library-access'

const bulkMoveSchema = z.object({
  planIds: z.array(z.string()).min(1),
  folderId: z.string().nullable(),
  ownerScope: z.enum(['athlete', 'coach']).optional()
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

  const context = getLibraryAccessContext(session.user)
  const { planIds, folderId, ownerScope } = validation.data
  const ownerUserId = getWritableLibraryOwnerId(context, parseLibraryScope(ownerScope, 'coach'))

  if (folderId) {
    const folder = await prisma.trainingPlanFolder.findFirst({
      where: { id: folderId, userId: ownerUserId }
    })

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
  }

  await prisma.trainingPlan.updateMany({
    where: {
      userId: ownerUserId,
      id: {
        in: planIds
      }
    },
    data: {
      folderId
    }
  })

  return { success: true }
})
