import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])

  const body = await readBody(event)
  const { checkinId, answers, userNotes } = body
  // answers: Record<string, "YES" | "NO">

  if (!checkinId || !answers) {
    throw createError({ statusCode: 400, message: 'Missing checkinId or answers' })
  }

  const checkin = await dailyCheckinRepository.findById(checkinId)

  if (!checkin) {
    throw createError({ statusCode: 404, message: 'Check-in not found' })
  }

  if (checkin.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Update the JSON questions with answers
  const questions = checkin.questions as any[]
  const updatedQuestions = questions.map((q) => {
    if (answers[q.id]) {
      return { ...q, answer: answers[q.id] }
    }
    return q
  })

  const updatedCheckin = await dailyCheckinRepository.update(checkinId, {
    questions: updatedQuestions,
    userNotes: userNotes || undefined
  })

  return updatedCheckin
})
