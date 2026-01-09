import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { llmUsageId, feedback, feedbackText } = body

  if (!llmUsageId || !feedback) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  // Verify ownership
  const llmUsage = await prisma.llmUsage.findUnique({
    where: { id: llmUsageId }
  })

  if (!llmUsage) {
    throw createError({ statusCode: 404, message: 'Usage record not found' })
  }

  if (llmUsage.userId !== (session.user as any).id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const updated = await prisma.llmUsage.update({
    where: { id: llmUsageId },
    data: {
      feedback,
      feedbackText
    }
  })

  return updated
})
