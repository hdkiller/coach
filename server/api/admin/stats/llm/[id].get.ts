import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID is required'
    })
  }

  // Fetch the LLM usage record (no userId check for admins)
  const usage = await prisma.llmUsage.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  if (!usage) {
    throw createError({
      statusCode: 404,
      message: 'Usage record not found'
    })
  }

  return {
    id: usage.id,
    operation: usage.operation,
    model: usage.model,
    provider: usage.provider,
    modelType: usage.modelType,
    entityType: usage.entityType,
    entityId: usage.entityId,
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCost: usage.estimatedCost,
    durationMs: usage.durationMs,
    retryCount: usage.retryCount,
    success: usage.success,
    errorType: usage.errorType,
    errorMessage: usage.errorMessage,
    promptPreview: usage.promptPreview,
    responsePreview: usage.responsePreview,
    promptFull: usage.promptFull,
    responseFull: usage.responseFull,
    feedback: usage.feedback,
    feedbackText: usage.feedbackText,
    createdAt: usage.createdAt,
    user: usage.user
  }
})
