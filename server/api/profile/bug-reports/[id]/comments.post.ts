import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(2000)
})

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

  const body = await readBody(event)
  const result = commentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const comment = await prisma.bugReportComment.create({
    data: {
      bugReportId: id,
      userId: session.user.id,
      content: result.data.content,
      isAdmin: false
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  return comment
})
