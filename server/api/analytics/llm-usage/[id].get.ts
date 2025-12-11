import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getServerSession } from '#auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID is required'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Fetch the LLM usage record
  const usage = await prisma.llmUsage.findFirst({
    where: {
      id,
      userId: user.id
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
    createdAt: usage.createdAt
  }
})