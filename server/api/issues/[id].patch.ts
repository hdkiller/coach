import { getServerSession } from '../../utils/session'
import { issuesRepository } from '../../utils/repositories/issuesRepository'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  try {
    const report = await issuesRepository.update(id, result.data, userId)
    return report
  } catch (error) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }
})
