import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { llmUsageId, feedback, feedbackText, roomId } = body

  if ((!llmUsageId && !roomId) || !feedback) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  let targetUsageId = llmUsageId

  // If provided roomId but no llmUsageId, try to find the last AI message's usage
  if (!targetUsageId && roomId) {
    const lastAiMessage = await prisma.chatMessage.findFirst({
      where: {
        roomId,
        senderId: 'ai_agent'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (lastAiMessage) {
      const usage = await prisma.llmUsage.findFirst({
        where: {
          entityType: 'ChatMessage',
          entityId: lastAiMessage.id
        }
      })
      if (usage) {
        targetUsageId = usage.id
      }
    }
  }

  if (!targetUsageId) {
    throw createError({ statusCode: 404, message: 'Usage record not found' })
  }

  // Verify ownership
  const llmUsage = await prisma.llmUsage.findUnique({
    where: { id: targetUsageId }
  })

  if (!llmUsage) {
    throw createError({ statusCode: 404, message: 'Usage record not found' })
  }

  if (llmUsage.userId !== (session.user as any).id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const updated = await prisma.llmUsage.update({
    where: { id: targetUsageId },
    data: {
      feedback,
      feedbackText
    }
  })

  // Sync back to entity if exists and has the fields
  if (llmUsage.entityType && llmUsage.entityId) {
    try {
      if (llmUsage.entityType === 'DailyCheckin') {
        await prisma.dailyCheckin.update({
          where: { id: llmUsage.entityId },
          data: { feedback, feedbackText }
        })
      } else if (llmUsage.entityType === 'Wellness') {
        await prisma.wellness.update({
          where: { id: llmUsage.entityId },
          data: { feedback, feedbackText }
        })
      } else if (llmUsage.entityType === 'Workout') {
        await prisma.workout.update({
          where: { id: llmUsage.entityId },
          data: { feedback, feedbackText }
        })
      } else if (llmUsage.entityType === 'Nutrition') {
        await prisma.nutrition.update({
          where: { id: llmUsage.entityId },
          data: { feedback, feedbackText }
        })
      } else if (llmUsage.entityType === 'Report') {
        await prisma.report.update({
          where: { id: llmUsage.entityId },
          data: { feedback, feedbackText }
        })
      }
    } catch (e) {
      console.warn(
        `[LlmFeedback] Failed to sync feedback back to ${llmUsage.entityType}:${llmUsage.entityId}`,
        e
      )
    }
  }

  return updated
})
