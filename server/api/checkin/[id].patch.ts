import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  reasoning: z.string().optional(),
  answer: z.enum(['YES', 'NO']).nullable().optional()
})

const bodySchema = z.object({
  questions: z.array(questionSchema),
  userNotes: z.string().trim().max(1000).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const id = getRouterParam(event, 'id')
  const body = bodySchema.parse(await readBody(event))

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing check-in id' })
  }

  const checkin = await dailyCheckinRepository.findById(id)

  if (!checkin) {
    throw createError({ statusCode: 404, message: 'Check-in not found' })
  }

  if (checkin.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return dailyCheckinRepository.update(id, {
    questions: body.questions,
    userNotes: body.userNotes || null,
    status: 'COMPLETED'
  })
})
