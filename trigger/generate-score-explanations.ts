import './init'
import { logger, task, tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { nutritionRepository } from '../server/utils/repositories/nutritionRepository'
import { generateStructuredAnalysis } from '../server/utils/gemini'
import { getUserTimezone, getStartOfDaysAgoUTC, formatUserDate } from '../server/utils/date'
import { userReportsQueue } from './queues'

interface TrendAnalysisSection {
  executive_summary: string
  sections: Array<{
    title: string
    status: string
    analysis_points: string[]
  }>
}

interface BatchedAnalysisResponse {
  [key: string]: TrendAnalysisSection
}

const PERIODS = [7, 14, 30, 90] // Days to analyze
const NUTRITION_METRICS = ['overall', 'macroBalance', 'quality', 'adherence', 'hydration']
const WORKOUT_METRICS = ['overall', 'technical', 'effort', 'pacing', 'execution']

// Cache expiration: explanations are valid for 24 hours
const EXPIRATION_HOURS = 24

function getMetricDisplayName(type: string, metric: string): string {
  const nutritionNames: Record<string, string> = {
    overall: 'Overall Nutrition Quality',
    macroBalance: 'Macronutrient Balance',
    quality: 'Food Quality',
    adherence: 'Goal Adherence',
    hydration: 'Hydration Status'
  }

  const workoutNames: Record<string, string> = {
    overall: 'Overall Workout Performance',
    technical: 'Technical Execution',
    effort: 'Effort Management',
    pacing: 'Pacing Strategy',
    execution: 'Workout Execution'
  }

  return type === 'nutrition' ? nutritionNames[metric] : workoutNames[metric]
}

async function generateUnifiedNutritionAnalysis(
  userId: string,
  period: number,
  summary: any,
  timezone: string
): Promise<{ analysis: BatchedAnalysisResponse; usageId?: string }> {
  // Fetch recent nutrition data for context
  const startDate = getStartOfDaysAgoUTC(timezone, period)

  const nutrition = await nutritionRepository.getForUser(userId, {
    startDate,
    limit: 15, // Increased context slightly for batching
    orderBy: { date: 'desc' },
    select: {
      date: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      waterMl: true
    }
  })

  const prompt = `Analyze these nutrition trends for an endurance athlete over the last ${period} days.

SUMMARY STATS:
- Total Logged Days: ${summary.total}
- Overall Score: ${summary.avgOverall?.toFixed(1)}/10
- Macro Balance: ${summary.avgMacroBalance?.toFixed(1)}/10
- Quality: ${summary.avgQuality?.toFixed(1)}/10
- Adherence: ${summary.avgAdherence?.toFixed(1)}/10
- Hydration: ${summary.avgHydration?.toFixed(1)}/10

RECENT LOGS:
${nutrition
  .map((n) => {
    const totalMacros = (n.protein || 0) + (n.carbs || 0) + (n.fat || 0)
    const proteinPct = totalMacros > 0 ? (((n.protein || 0) / totalMacros) * 100).toFixed(0) : 0
    const carbsPct = totalMacros > 0 ? (((n.carbs || 0) / totalMacros) * 100).toFixed(0) : 0
    const fatPct = totalMacros > 0 ? (((n.fat || 0) / totalMacros) * 100).toFixed(0) : 0
    return `- ${formatUserDate(n.date, timezone)}: ${n.calories || 0}kcal (P:${proteinPct}% C:${carbsPct}% F:${fatPct}%) Water: ${n.waterMl ? (n.waterMl / 1000).toFixed(1) : 0}L`
  })
  .join('\n')}

INSTRUCTIONS:
Provide a structured analysis for EACH of the following metrics:
${NUTRITION_METRICS.map((m) => `- ${getMetricDisplayName('nutrition', m)} (Key: "${m}")`).join('\n')}

For each metric, provide:
1. An executive summary (2-3 sentences)
2. Detailed analysis sections with status (excellent, good, moderate, needs_improvement)`

  // Construct schema for all metrics
  const metricSchema = {
    type: 'object',
    properties: {
      executive_summary: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            status: {
              type: 'string',
              enum: ['excellent', 'good', 'moderate', 'needs_improvement']
            },
            analysis_points: { type: 'array', items: { type: 'string' } }
          },
          required: ['title', 'status', 'analysis_points']
        }
      }
    },
    required: ['executive_summary', 'sections']
  }

  const schema = {
    type: 'object',
    properties: NUTRITION_METRICS.reduce((acc, metric) => {
      acc[metric] = metricSchema
      return acc
    }, {} as any),
    required: NUTRITION_METRICS
  }

  let usageId: string | undefined
  const analysis = await generateStructuredAnalysis<BatchedAnalysisResponse>(
    prompt,
    schema,
    'flash',
    {
      userId,
      operation: 'nutrition_score_explanation_batch',
      entityType: 'ScoreTrendExplanation',
      entityId: undefined, // Multiple entities
      onUsageLogged: (id) => {
        usageId = id
      }
    }
  )

  return { analysis, usageId }
}

async function generateUnifiedWorkoutAnalysis(
  userId: string,
  period: number,
  summary: any,
  timezone: string
): Promise<{ analysis: BatchedAnalysisResponse; usageId?: string }> {
  // Fetch recent workout data for context
  const startDate = getStartOfDaysAgoUTC(timezone, period)

  const workouts = await workoutRepository.getForUser(userId, {
    startDate,
    limit: 15,
    orderBy: { date: 'desc' },
    select: {
      date: true,
      title: true,
      type: true,
      durationSec: true,
      tss: true,
      averageWatts: true,
      averageHr: true,
      rpe: true,
      feel: true,
      overallScore: true,
      technicalScore: true,
      effortScore: true,
      pacingScore: true,
      executionScore: true
    }
  })

  const prompt = `Analyze these workout trends for an endurance athlete over the last ${period} days.

SUMMARY STATS:
- Total Workouts: ${summary.total}
- Overall Score: ${summary.avgOverall?.toFixed(1)}/10
- Technical: ${summary.avgTechnical?.toFixed(1)}/10
- Effort: ${summary.avgEffort?.toFixed(1)}/10
- Pacing: ${summary.avgPacing?.toFixed(1)}/10
- Execution: ${summary.avgExecution?.toFixed(1)}/10

RECENT WORKOUTS:
${workouts
  .map((w) => {
    return `- ${formatUserDate(w.date, timezone)}: ${w.title} (${w.type}) - ${Math.round(w.durationSec / 60)}min, TSS: ${w.tss?.toFixed(0) || 'N/A'}, Power: ${w.averageWatts || 'N/A'}W, HR: ${w.averageHr || 'N/A'}bpm, RPE: ${w.rpe || 'N/A'}, Feel: ${w.feel ? w.feel * 2 : 'N/A'}/10`
  })
  .join('\n')}

INSTRUCTIONS:
Provide a structured analysis for EACH of the following metrics:
${WORKOUT_METRICS.map((m) => `- ${getMetricDisplayName('workout', m)} (Key: "${m}")`).join('\n')}

For each metric, provide:
1. An executive summary (2-3 sentences)
2. Detailed analysis sections with status (excellent, good, moderate, needs_improvement)`

  const metricSchema = {
    type: 'object',
    properties: {
      executive_summary: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            status: {
              type: 'string',
              enum: ['excellent', 'good', 'moderate', 'needs_improvement']
            },
            analysis_points: { type: 'array', items: { type: 'string' } }
          },
          required: ['title', 'status', 'analysis_points']
        }
      }
    },
    required: ['executive_summary', 'sections']
  }

  const schema = {
    type: 'object',
    properties: WORKOUT_METRICS.reduce((acc, metric) => {
      acc[metric] = metricSchema
      return acc
    }, {} as any),
    required: WORKOUT_METRICS
  }

  let usageId: string | undefined
  const analysis = await generateStructuredAnalysis<BatchedAnalysisResponse>(
    prompt,
    schema,
    'flash',
    {
      userId,
      operation: 'workout_score_explanation_batch',
      entityType: 'ScoreTrendExplanation',
      entityId: undefined,
      onUsageLogged: (id) => {
        usageId = id
      }
    }
  )

  return { analysis, usageId }
}

async function calculateNutritionSummary(userId: string, period: number, timezone: string) {
  const startDate = getStartOfDaysAgoUTC(timezone, period)
  const allNutrition = await nutritionRepository.getForUser(userId, {
    startDate,
    select: {
      overallScore: true,
      macroBalanceScore: true,
      qualityScore: true,
      adherenceScore: true,
      hydrationScore: true
    }
  })

  const nutrition = allNutrition.filter((n: any) => n.overallScore != null)
  if (nutrition.length === 0) return null

  return {
    total: nutrition.length,
    avgOverall: nutrition.reduce((sum, n) => sum + (n.overallScore || 0), 0) / nutrition.length,
    avgMacroBalance:
      nutrition.reduce((sum, n) => sum + (n.macroBalanceScore || 0), 0) / nutrition.length,
    avgQuality: nutrition.reduce((sum, n) => sum + (n.qualityScore || 0), 0) / nutrition.length,
    avgAdherence: nutrition.reduce((sum, n) => sum + (n.adherenceScore || 0), 0) / nutrition.length,
    avgHydration: nutrition.reduce((sum, n) => sum + (n.hydrationScore || 0), 0) / nutrition.length
  }
}

async function calculateWorkoutSummary(userId: string, period: number, timezone: string) {
  const startDate = getStartOfDaysAgoUTC(timezone, period)
  const allWorkouts = await workoutRepository.getForUser(userId, {
    startDate,
    select: {
      overallScore: true,
      technicalScore: true,
      effortScore: true,
      pacingScore: true,
      executionScore: true
    }
  })

  const workouts = allWorkouts.filter((w: any) => w.overallScore != null)
  if (workouts.length === 0) return null

  return {
    total: workouts.length,
    avgOverall: workouts.reduce((sum, w) => sum + (w.overallScore || 0), 0) / workouts.length,
    avgTechnical: workouts.reduce((sum, w) => sum + (w.technicalScore || 0), 0) / workouts.length,
    avgEffort: workouts.reduce((sum, w) => sum + (w.effortScore || 0), 0) / workouts.length,
    avgPacing: workouts.reduce((sum, w) => sum + (w.pacingScore || 0), 0) / workouts.length,
    avgExecution: workouts.reduce((sum, w) => sum + (w.executionScore || 0), 0) / workouts.length
  }
}

export const generateScoreExplanationsTask = task({
  id: 'generate-score-explanations',
  maxDuration: 600,
  queue: userReportsQueue,
  run: async (payload: { userId: string; force?: boolean }) => {
    const { userId, force } = payload

    logger.log('='.repeat(60))
    logger.log('🎯 GENERATING SCORE EXPLANATIONS (BATCHED)')
    logger.log('='.repeat(60))
    logger.log(`User ID: ${userId}`)

    const timezone = await getUserTimezone(userId)
    const results = { generated: 0, skipped: 0, failed: 0, details: [] as any[] }
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + EXPIRATION_HOURS)

    // --- NUTRITION ---
    logger.log('\n📊 Processing Nutrition...')
    for (const period of PERIODS) {
      const summary = await calculateNutritionSummary(userId, period, timezone)
      if (!summary) {
        logger.log(`  ⏭️  Skipping ${period}d - no data`)
        results.skipped += NUTRITION_METRICS.length
        continue
      }

      // Check if ALL metrics for this period are already valid
      // Optimization: If we have valid caches for all, skip the batch call
      if (!force) {
        const existingCount = await prisma.scoreTrendExplanation.count({
          where: {
            userId,
            type: 'nutrition',
            period,
            expiresAt: { gt: new Date() }
          }
        })
        if (existingCount === NUTRITION_METRICS.length) {
          logger.log(`  ⏭️  ${period}d Nutrition - all cached`)
          results.skipped += NUTRITION_METRICS.length
          continue
        }
      }

      logger.log(`  🔄 Generating ${period}d Nutrition Batch...`)
      try {
        const { analysis, usageId } = await generateUnifiedNutritionAnalysis(
          userId,
          period,
          summary,
          timezone
        )

        // Save results
        for (const metric of NUTRITION_METRICS) {
          if (!analysis[metric]) continue

          const score = summary[
            `avg${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof typeof summary
          ] as number

          const explanation = await prisma.scoreTrendExplanation.upsert({
            where: {
              userId_type_period_metric: { userId, type: 'nutrition', period, metric }
            },
            create: {
              userId,
              type: 'nutrition',
              period,
              metric,
              score,
              analysisData: analysis[metric] as any,
              expiresAt,
              llmUsageId: usageId
            },
            update: {
              score,
              analysisData: analysis[metric] as any,
              generatedAt: new Date(),
              expiresAt,
              llmUsageId: usageId
            }
          })
          results.generated++
        }
        logger.log(`  ✅ ${period}d Nutrition Batch Complete`)
      } catch (error) {
        logger.error(`  ❌ ${period}d Nutrition Batch Failed:`, error)
        results.failed += NUTRITION_METRICS.length
      }
    }

    // --- WORKOUT ---
    logger.log('\n💪 Processing Workouts...')
    for (const period of PERIODS) {
      const summary = await calculateWorkoutSummary(userId, period, timezone)
      if (!summary) {
        logger.log(`  ⏭️  Skipping ${period}d - no data`)
        results.skipped += WORKOUT_METRICS.length
        continue
      }

      if (!force) {
        const existingCount = await prisma.scoreTrendExplanation.count({
          where: {
            userId,
            type: 'workout',
            period,
            expiresAt: { gt: new Date() }
          }
        })
        if (existingCount === WORKOUT_METRICS.length) {
          logger.log(`  ⏭️  ${period}d Workouts - all cached`)
          results.skipped += WORKOUT_METRICS.length
          continue
        }
      }

      logger.log(`  🔄 Generating ${period}d Workout Batch...`)
      try {
        const { analysis, usageId } = await generateUnifiedWorkoutAnalysis(
          userId,
          period,
          summary,
          timezone
        )

        for (const metric of WORKOUT_METRICS) {
          if (!analysis[metric]) continue

          const score = summary[
            `avg${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof typeof summary
          ] as number

          await prisma.scoreTrendExplanation.upsert({
            where: {
              userId_type_period_metric: { userId, type: 'workout', period, metric }
            },
            create: {
              userId,
              type: 'workout',
              period,
              metric,
              score,
              analysisData: analysis[metric] as any,
              expiresAt,
              llmUsageId: usageId
            },
            update: {
              score,
              analysisData: analysis[metric] as any,
              generatedAt: new Date(),
              expiresAt,
              llmUsageId: usageId
            }
          })
          results.generated++
        }
        logger.log(`  ✅ ${period}d Workout Batch Complete`)
      } catch (error) {
        logger.error(`  ❌ ${period}d Workout Batch Failed:`, error)
        results.failed += WORKOUT_METRICS.length
      }
    }

    // --- TRIGGER RECOMMENDATIONS ---
    logger.log('\n🚀 Triggering Recommendation Generation...')
    await tasks.trigger(
      'generate-recommendations',
      { userId },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )

    return {
      success: results.failed === 0,
      ...results,
      userId
    }
  }
})
