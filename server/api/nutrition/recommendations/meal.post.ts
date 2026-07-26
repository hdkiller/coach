import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { dispatchTask } from '../../../utils/task-dispatcher'
import { prisma } from '../../../utils/db'

/** A completed suggestion for the same window and targets is reused for this long. */
const RECOMMENDATION_REUSE_MS = 30 * 60 * 1000

function targetsMatch(contextJson: any, body: any) {
  const requested = contextJson?.requestedTargets
  if (!requested) return false

  const same = (a: unknown, b: unknown) => Number(a || 0) === Number(b || 0)
  return (
    same(requested.carbs, body.targetCarbs) &&
    same(requested.protein, body.targetProtein) &&
    same(requested.kcal, body.targetKcal)
  )
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id
  const body = await readBody(event)

  if (!body.date) {
    throw createError({ statusCode: 400, message: 'Date is required' })
  }

  const date = new Date(body.date)
  if (Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date' })
  }

  const requestedTargets = {
    carbs: Number(body.targetCarbs || 0),
    protein: Number(body.targetProtein || 0),
    kcal: Number(body.targetKcal || 0)
  }

  // Reopening the modal, or clicking suggest twice, should not cost another model run. Only an
  // explicit "regenerate" (forceLlm) bypasses the cache.
  if (!body.forceLlm) {
    const recent = await prisma.nutritionRecommendation.findFirst({
      where: {
        userId,
        date,
        scope: 'MEAL',
        windowType: body.windowType ?? null,
        status: 'COMPLETED',
        updatedAt: { gte: new Date(Date.now() - RECOMMENDATION_REUSE_MS) }
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (recent && targetsMatch(recent.contextJson as any, body)) {
      return {
        success: true,
        cached: true,
        runId: recent.runId,
        recommendationId: recent.id
      }
    }
  }

  const recommendation = await prisma.nutritionRecommendation.create({
    data: {
      userId,
      date,
      scope: 'MEAL',
      windowType: body.windowType,
      status: 'PROCESSING',
      contextJson: { requestedTargets }
    }
  })

  const handle = await dispatchTask(
    'recommend-nutrition-meal',
    {
      userId,
      date: body.date,
      windowType: body.windowType,
      forceLlm: body.forceLlm,
      targetCarbs: body.targetCarbs,
      targetProtein: body.targetProtein,
      targetKcal: body.targetKcal,
      recommendationId: recommendation.id
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  await prisma.nutritionRecommendation.update({
    where: { id: recommendation.id },
    data: { runId: handle.id }
  })

  return {
    success: true,
    cached: false,
    runId: handle.id,
    recommendationId: recommendation.id
  }
})
