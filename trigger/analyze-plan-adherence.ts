import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateStructuredAnalysis } from '../server/utils/gemini'
import { prisma } from '../server/utils/db'
import { userReportsQueue } from './queues'
import { queueWorkoutInsightEmail } from '../server/utils/workout-insight-email'
import { formatStructuredPlanForPrompt } from './utils/planned-workout-targets'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'
import {
  buildWorkoutAnalysisFactsV2,
  formatActualIntervalsForPrompt,
  getActualIntervalsSourceForAnalysis
} from '../server/utils/workout-analysis-facts'

interface AdherenceAnalysis {
  overallScore: number
  intensityScore: number
  durationScore: number
  executionScore: number
  cadenceScore: number
  summary: string
  deviations: Array<{
    metric: string
    planned: string
    actual: string
    deviation: string
    impact: string
  }>
  recommendations: string[]
}

const adherenceSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer', description: '0-100 score of overall adherence' },
    intensityScore: { type: 'integer', description: '0-100 score for intensity adherence' },
    durationScore: { type: 'integer', description: '0-100 score for duration adherence' },
    executionScore: { type: 'integer', description: '0-100 score for structured execution' },
    cadenceScore: { type: 'integer', description: '0-100 score for cadence adherence' },
    summary: { type: 'string', description: 'Executive summary of adherence' },
    deviations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          planned: { type: 'string' },
          actual: { type: 'string' },
          deviation: { type: 'string', description: "e.g. '+15%'" },
          impact: { type: 'string', description: 'Impact on training goal' }
        }
      }
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['overallScore', 'summary', 'deviations']
}

export function buildPlanAdherencePrompt(workout: any, plan: any, sportSettings?: any): string {
  const structuredPlan = formatStructuredPlanForPrompt(plan.structuredWorkout, {
    ftp: workout.ftp || sportSettings?.ftp || workout.user?.ftp || null
  })
  const actualIntervals = formatActualIntervalsForPrompt(workout, plan)
  const actualIntervalsSource = getActualIntervalsSourceForAnalysis(workout, plan)
  const adherenceFacts = buildWorkoutAnalysisFactsV2({
    workout,
    sportSettings,
    plannedWorkout: plan,
    userProfile: {
      language: workout.user?.language || null
    }
  }).adherence
  const actualIntervalsSourceLabel =
    actualIntervalsSource === 'detected'
      ? 'stream-detected intervals (fallback because synced interval blocks were missing or weak)'
      : actualIntervalsSource === 'raw'
        ? 'synced raw intervals'
        : 'none'

  let zoneDefinitions = ''
  if (sportSettings) {
    zoneDefinitions += `\n      ## Defined Training Zones (Reference)\n`
    if (sportSettings.ftp) zoneDefinitions += `      - **FTP**: ${sportSettings.ftp} W\n`
    if (sportSettings.lthr) zoneDefinitions += `      - **LTHR**: ${sportSettings.lthr} bpm\n`

    if (sportSettings.hrZones && Array.isArray(sportSettings.hrZones)) {
      zoneDefinitions += '      - **Heart Rate Zones**:\n'
      sportSettings.hrZones.forEach((z: any) => {
        zoneDefinitions += `        - ${z.name}: ${z.min}-${z.max} bpm\n`
      })
    }

    if (sportSettings.powerZones && Array.isArray(sportSettings.powerZones)) {
      zoneDefinitions += '      - **Power Zones**:\n'
      sportSettings.powerZones.forEach((z: any) => {
        zoneDefinitions += `        - ${z.name}: ${z.min}-${z.max} W\n`
      })
    }
  }

  return `Analyze the adherence of this completed workout to the planned workout.
      
      PLANNED:
      - Title: ${plan.title}
      - Type: ${plan.type}
      - Duration: ${plan.durationSec ? Math.round(plan.durationSec / 60) + 'm' : 'N/A'}
      - TSS: ${plan.tss || 'N/A'}
      - Intensity: ${plan.workIntensity ? (plan.workIntensity * 100).toFixed(0) + '%' : 'N/A'}
      - Description: ${plan.description || 'N/A'}
      - Structured Plan:
      ${structuredPlan}
      
      COMPLETED:
      - Duration: ${Math.round(workout.durationSec / 60)}m
      - TSS: ${workout.tss || 'N/A'}
      - Avg Power: ${workout.averageWatts || 'N/A'}W
      - Avg Cadence: ${workout.averageCadence || 'N/A'}rpm
      - Norm Power: ${workout.normalizedPower || 'N/A'}W
      - Avg HR: ${workout.averageHr || 'N/A'}bpm
      - Description: ${workout.description || 'N/A'}
      
      ACTUAL INTERVALS:
      - Source: ${actualIntervalsSourceLabel}
      ${actualIntervals}

      DETECTED ADHERENCE FACTS:
      - Completion vs Plan: ${adherenceFacts.completionPct ?? 'N/A'}%
      - Duration vs Plan: ${adherenceFacts.durationVsPlanPct ?? 'N/A'}%
      - Work Interval Hit Rate: ${adherenceFacts.workIntervalHitRate ?? 'N/A'}%
      - Recovery Hit Rate: ${adherenceFacts.recoveryHitRate ?? 'N/A'}%
      - Cadence Hit Rate: ${adherenceFacts.cadenceHitRate ?? 'N/A'}%
      - Cadence Assessable: ${adherenceFacts.cadenceAssessable ? 'Yes' : 'No'}
      - Structure Matched: ${adherenceFacts.structureMatched ? 'Yes' : 'No'}
      - Execution Classification: ${adherenceFacts.executionClassification}
      ${zoneDefinitions}
      USER CONTEXT:
      - FTP: ${sportSettings?.ftp || workout.ftp || workout.user.ftp || 'N/A'}W
      - Preferred Language: ${workout.user.language || 'English'} (CRITICAL: ALL analysis, reasoning, summaries, and feedback MUST be written in this language)
      
      INSTRUCTIONS:
      1. Calculate an overall adherence score (0-100) based on how well the execution matched the plan.
      2. Analyze deviations in Duration, Intensity (Power/HR), and Structure.
      3. Provide specific feedback on what was missed or exceeded.
      4. Compare the "Structured Plan" steps against the "ACTUAL INTERVALS". Did they do the intervals?
      5. For planned intensity, trust numeric structured values (power/hr/pace) as source of truth. Do NOT infer targets from step names/titles.
      6. If actual intervals come from stream-detected fallback, treat them as the best available execution evidence rather than assuming the workout was unstructured.
      7. Cadence adherence is a first-class scoring dimension when cadence is prescribed. Score cadence directly using the detected cadence facts and actual interval cadence values, not the whole-workout average cadence alone.
      8. For steady cadence targets, treat +/- 5 rpm as on-target. For warmup/cooldown ramps, use a looser judgement based on average cadence and trend consistency.
      9. Weight the final adherence score approximately as: duration 25%, intensity 30%, execution 25%, cadence 20% when cadence is prescribed.
      10. "impact" should describe how the deviation affects the training stimulus (e.g. "Reduced aerobic benefit", "Excessive fatigue risk").
      
      OUTPUT JSON matching the schema.`
}

export const analyzePlanAdherenceTask = task({
  id: 'analyze-plan-adherence',
  queue: userReportsQueue,
  maxDuration: 300,
  run: async (payload: { workoutId: string; plannedWorkoutId: string }) => {
    const { workoutId, plannedWorkoutId } = payload

    // Fetch data
    const [workout, plan] = await Promise.all([
      prisma.workout.findUnique({
        where: { id: workoutId },
        include: {
          streams: true,
          user: { select: { ftp: true, aiPersona: true, language: true } }
        }
      }),
      prisma.plannedWorkout.findUnique({
        where: { id: plannedWorkoutId }
      })
    ])

    if (!workout || !plan) throw new Error('Workout or Plan not found')

    // Fetch Sport Specific Settings
    const sportSettings = await sportSettingsRepository.getForActivityType(
      workout.userId,
      workout.type || ''
    )

    // Create/Update initial adherence record
    await prisma.planAdherence.upsert({
      where: { workoutId },
      create: {
        workoutId,
        plannedWorkoutId,
        analysisStatus: 'PROCESSING'
      },
      update: {
        analysisStatus: 'PROCESSING'
      }
    })

    try {
      const prompt = buildPlanAdherencePrompt(workout, plan, sportSettings)

      const analysis = await generateStructuredAnalysis<AdherenceAnalysis>(
        prompt,
        adherenceSchema,
        'flash',
        {
          userId: workout.userId,
          operation: 'analyze_plan_adherence',
          entityType: 'PlanAdherence',
          entityId: workoutId
        }
      )

      // Save results
      await prisma.planAdherence.update({
        where: { workoutId },
        data: {
          overallScore: analysis.overallScore,
          intensityScore: analysis.intensityScore,
          durationScore: analysis.durationScore,
          executionScore: analysis.executionScore,
          cadenceScore: analysis.cadenceScore,
          summary: analysis.summary,
          deviations: analysis.deviations,
          recommendations: analysis.recommendations,
          analysisStatus: 'COMPLETED',
          analyzedAt: new Date(),
          modelVersion: 'gemini-2.0-flash'
        }
      })

      try {
        const emailResult = await queueWorkoutInsightEmail({
          workoutId,
          triggerType: 'on-adherence-ready',
          adherenceSummary: analysis.summary,
          adherenceScore: analysis.overallScore
        })
        logger.log('Workout insight email decision (adherence-ready)', {
          workoutId,
          emailResult
        })
      } catch (emailError) {
        logger.warn('Failed to trigger adherence insight email', { workoutId, error: emailError })
      }

      return { success: true, workoutId }
    } catch (error: any) {
      logger.error('Plan adherence analysis failed', { error })

      await prisma.planAdherence.update({
        where: { workoutId },
        data: {
          analysisStatus: 'FAILED',
          summary: 'Analysis failed: ' + error.message
        }
      })

      throw error
    }
  }
})
