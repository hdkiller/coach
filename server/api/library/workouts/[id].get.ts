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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout template ID' })
  }

  const context = getLibraryAccessContext(session.user)
  const scope = parseLibraryScope(getQuery(event).scope, context.isCoaching ? 'all' : 'athlete')
  const ownerIds = getReadableLibraryOwnerIds(context, scope)

  const template = await (prisma as any).workoutTemplate.findFirst({
    where: {
      id,
      userId: { in: ownerIds }
    },
    include: {
      folder: {
        select: {
          id: true,
          name: true,
          parentId: true
        }
      }
    }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  // Get user FTP for scaling/display
  const user = await prisma.user.findUnique({
    where: { id: context.effectiveUserId },
    select: { ftp: true, lthr: true }
  })

  return {
    template: annotateLibraryOwner(context, template),
    userFtp: user?.ftp,
    userLthr: user?.lthr
  }
})
