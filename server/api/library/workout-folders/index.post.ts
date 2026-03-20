import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'
import {
  getLibraryAccessContext,
  getWritableLibraryOwnerId,
  parseLibraryScope
} from '../../../utils/library-access'

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  parentId: z.string().nullable().optional(),
  ownerScope: z.enum(['athlete', 'coach']).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const validation = createFolderSchema.safeParse(await readBody(event))
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const context = getLibraryAccessContext(session.user)
  const { name, parentId = null, ownerScope } = validation.data
  const ownerUserId = getWritableLibraryOwnerId(context, parseLibraryScope(ownerScope, 'coach'))

  if (parentId) {
    const parent = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: parentId, userId: ownerUserId }
    })

    if (!parent) {
      throw createError({ statusCode: 404, message: 'Parent folder not found' })
    }
  }

  const siblingCount = await (prisma as any).workoutTemplateFolder.count({
    where: { userId: ownerUserId, parentId }
  })

  const folder = await (prisma as any).workoutTemplateFolder.create({
    data: {
      userId: ownerUserId,
      name,
      parentId,
      order: siblingCount
    }
  })

  return folder
})
