import { requireAuth } from '../../utils/auth-guard'
import { issuesRepository } from '../../utils/repositories/issuesRepository'
import { z } from 'zod/v3'

const createSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  context: z.any().optional(),
  logs: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['issue:write'])
  const userId = user.id

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
