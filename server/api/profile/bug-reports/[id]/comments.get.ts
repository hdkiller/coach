import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  // Verify ownership
  const report = await prisma.bugReport.findUnique({
    where: { id, userId: session.user.id }
  })

  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Bug report not found' })
  }

  const comments = await prisma.bugReportComment.findMany({
    where: { bugReportId: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return comments
})
