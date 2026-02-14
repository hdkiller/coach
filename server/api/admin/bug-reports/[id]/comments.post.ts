import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(2000)
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
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
      isAdmin: true
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
