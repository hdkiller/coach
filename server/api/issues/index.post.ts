import { getServerSession } from '../../utils/session'
import { issuesRepository } from '../../utils/repositories/issuesRepository'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  context: z.any().optional(),
  logs: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const body = await readBody(event)
  const result = createSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const report = await issuesRepository.create(userId, result.data)

  return report
})
