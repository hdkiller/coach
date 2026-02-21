import { tool } from 'ai'
import { z } from 'zod'
import { workoutRepository } from '../repositories/workoutRepository'
import { ingestAllTask } from '../../../trigger/ingest-all'
import { generateReportTask } from '../../../trigger/generate-report'
import { prisma } from '../../utils/db'
import { getStartOfDaysAgoUTC, formatDateUTC, formatUserDate } from '../../utils/date'
import { calculateProjectedPMC, getInitialPMCValues } from '../../utils/training-stress'
import type { AiSettings } from '../ai-user-settings'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const roundToOne = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const estimateTssFromWorkoutType = (durationMinutes: number, type?: string | null) => {
  const normalizedType = (type || '').toLowerCase()
  const hourlyTss =
    normalizedType.includes('recovery') || normalizedType.includes('easy')
      ? 30
      : normalizedType.includes('vo2') || normalizedType.includes('anaerobic')
        ? 85
        : normalizedType.includes('threshold') || normalizedType.includes('tempo')
          ? 70
          : 50
  return roundToOne((durationMinutes / 60) * hourlyTss)
}

const buildForecastSummary = ({
  endDate,
  focusMetric,
  startCtl,
  finalCtl,
  finalTsb,
  predictionsCount
}: {
  endDate: string
  focusMetric?: 'FTP' | 'PeakPower' | 'CTL' | 'TSB' | null
  startCtl: number
  finalCtl: number
  finalTsb: number
  predictionsCount: number
}) => {
  const focusLineMap: Record<string, string> = {
    FTP: `Focus metric: FTP trend is supported by a CTL delta of ${roundToOne(finalCtl - startCtl)}.`,
    PeakPower: `Focus metric: Peak power readiness is tied to fatigue management (TSB ${finalTsb >= 0 ? '+' : ''}${finalTsb}).`,
    CTL: `Focus metric: CTL is projected to move from ${startCtl} to ${finalCtl}.`,
    TSB: `Focus metric: TSB is projected at ${finalTsb >= 0 ? '+' : ''}${finalTsb} by ${endDate}.`
  }

  const trainingPhase =
    finalTsb >= 5
      ? 'a fresher phase'
      : finalTsb >= -10
        ? 'a balanced build phase'
        : 'a heavy load phase'

  return `Projected through ${endDate} (${predictionsCount} days): CTL ${finalCtl}, TSB ${finalTsb >= 0 ? '+' : ''}${finalTsb}, indicating ${trainingPhase}. ${focusMetric ? focusLineMap[focusMetric] : ''}`.trim()
}

export const analysisTools = (userId: string, timezone: string, settings: AiSettings) => ({
  analyze_training_load: tool({
    description:
      'Analyze training load (ATL, CTL, TSB) and progression over a time range. Use this to assess fatigue, fitness, and form.',
    inputSchema: z.object({
      start_date: z.string().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)')
    }),
    execute: async ({ start_date, end_date }) => {
      const start = new Date(start_date)
      const end = end_date ? new Date(end_date) : new Date()

      const workouts = await workoutRepository.getForUser(userId, {
        startDate: start,
        endDate: end,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          tss: true,
          durationSec: true
        } as any // Cast because repo types might be slightly strict on select vs include
      })

      // Simple aggregation (in reality would fetch pre-calculated metrics)
      const totalTSS = workouts.reduce((sum: number, w: any) => sum + (w.tss || 0), 0)
      const avgTSS = totalTSS / (workouts.length || 1)

      return {
        period: { start: start_date, end: end_date || 'now' },
        total_workouts: workouts.length,
        total_tss: Math.round(totalTSS),
        avg_tss: Math.round(avgTSS),
        // TODO: Implement actual ATL/CTL/TSB calculation or fetch from DB
        metrics: 'Detailed ATL/CTL/TSB requires historical processing.'
      }
    }
  }),

  forecast_training_load: tool({
    description:
      'Forecast future CTL, ATL, and TSB over a date range using planned workouts or hypothetical workouts, and optionally highlight FTP/PeakPower outlook.',
    inputSchema: z.object({
      start_date: isoDateSchema.describe('Start date (YYYY-MM-DD)'),
      end_date: isoDateSchema.describe('End date (YYYY-MM-DD)'),
      planned_workouts: z
        .array(
          z.object({
            date: isoDateSchema.describe('Workout date (YYYY-MM-DD)'),
            tss: z.number().min(0).optional().describe('Workout TSS (preferred when known)'),
            type: z
              .string()
              .optional()
              .describe('Workout type (used for TSS estimation if needed)'),
            duration_minutes: z
              .number()
              .positive()
              .optional()
              .describe('Duration in minutes (used for TSS estimation)')
          })
        )
        .optional()
        .describe('Optional hypothetical workouts to simulate instead of current planned workouts'),
      focus_metric: z
        .enum(['FTP', 'PeakPower', 'CTL', 'TSB'])
        .optional()
        .describe('Optional metric to highlight in the summary')
    }),
    execute: async ({ start_date, end_date, planned_workouts, focus_metric }) => {
      if (start_date > end_date) {
        return { error: 'start_date must be on or before end_date' }
      }

      const startDate = new Date(`${start_date}T00:00:00Z`)
      const endDate = new Date(`${end_date}T00:00:00Z`)
      const initial = await getInitialPMCValues(userId, startDate)

      const plannedWorkoutsForProjection = planned_workouts?.length
        ? planned_workouts
            .map((workout) => {
              const resolvedTss =
                workout.tss ??
                (workout.duration_minutes
                  ? estimateTssFromWorkoutType(workout.duration_minutes, workout.type)
                  : 0)

              return {
                date: new Date(`${workout.date}T00:00:00Z`),
                tss: resolvedTss
              }
            })
            .filter((workout) => workout.date >= startDate && workout.date <= endDate)
        : (
            await prisma.plannedWorkout.findMany({
              where: {
                userId,
                date: { gte: startDate, lte: endDate },
                completionStatus: { not: 'COMPLETED' },
                completed: { not: true }
              },
              select: {
                date: true,
                tss: true
              },
              orderBy: { date: 'asc' }
            })
          ).map((workout) => ({
            date: workout.date,
            tss: workout.tss
          }))

      const projected = calculateProjectedPMC(
        startDate,
        endDate,
        initial.ctl,
        initial.atl,
        plannedWorkoutsForProjection
      )

      if (projected.length === 0) {
        return {
          predictions: [],
          summary: 'No forecast could be generated for the requested date range.'
        }
      }

      const predictions = projected.map((day) => ({
        date: formatDateUTC(day.date),
        ctl: roundToOne(day.ctl),
        atl: roundToOne(day.atl),
        tsb: roundToOne(day.tsb)
      }))

      const firstPrediction = predictions[0]!
      const finalPrediction = predictions[predictions.length - 1]!
      const ctlDelta = finalPrediction.ctl - firstPrediction.ctl

      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { ftp: true }
      })

      const strongestRecentWorkout = await prisma.workout.findFirst({
        where: {
          userId,
          isDuplicate: false,
          maxWatts: { not: null },
          date: { gte: getStartOfDaysAgoUTC(timezone, 120) }
        },
        select: {
          maxWatts: true
        },
        orderBy: {
          maxWatts: 'desc'
        }
      })

      const days = Math.max(1, predictions.length)
      const freshnessBias = clamp(finalPrediction.tsb / 8, -2, 3)
      const loadBias = clamp(ctlDelta * 0.45, -6, 10)

      const ftp_forecast =
        userProfile?.ftp && userProfile.ftp > 0
          ? {
              ftp: roundToOne(userProfile.ftp + loadBias + freshnessBias),
              date: finalPrediction.date,
              confidence: roundToOne(
                clamp(
                  0.45 + Math.min(days, 21) / 60 + Math.min(Math.abs(ctlDelta), 8) / 30,
                  0.4,
                  0.9
                )
              )
            }
          : undefined

      const peak_power_forecast =
        strongestRecentWorkout?.maxWatts && strongestRecentWorkout.maxWatts > 0
          ? {
              peak_power: roundToOne(
                strongestRecentWorkout.maxWatts *
                  (1 + clamp(ctlDelta * 0.0015 + finalPrediction.tsb / 500, -0.03, 0.05))
              ),
              date: finalPrediction.date,
              confidence: roundToOne(clamp(0.4 + Math.min(days, 21) / 70, 0.35, 0.85))
            }
          : undefined

      return {
        predictions,
        summary: buildForecastSummary({
          endDate: finalPrediction.date,
          focusMetric: focus_metric,
          startCtl: firstPrediction.ctl,
          finalCtl: finalPrediction.ctl,
          finalTsb: finalPrediction.tsb,
          predictionsCount: predictions.length
        }),
        ...(ftp_forecast ? { ftp_forecast } : {}),
        ...(peak_power_forecast ? { peak_power_forecast } : {}),
        focus_metric: focus_metric || 'CTL'
      }
    }
  }),

  sync_data: tool({
    description:
      'Sync training and wellness data from all connected services (Strava, Whoop, Intervals.icu, Yazio, etc). Use this when the user says they just finished a workout or their data is out of date.',
    inputSchema: z.object({
      days: z.number().optional().default(3).describe('Number of days to sync back (default 3)')
    }),
    needsApproval: false,
    execute: async ({ days = 3 }) => {
      const startDate = formatUserDate(getStartOfDaysAgoUTC(timezone, days), timezone, 'yyyy-MM-dd')
      const endDate = formatUserDate(new Date(), timezone, 'yyyy-MM-dd')

      try {
        await ingestAllTask.trigger(
          { userId, startDate, endDate },
          {
            tags: [`user:${userId}`, 'manual-sync'],
            concurrencyKey: userId
          }
        )
        return {
          success: true,
          message: `Data synchronization for the last ${days} days has been started.`
        }
      } catch (e: any) {
        return { error: `Failed to trigger sync: ${e.message}` }
      }
    }
  }),

  generate_report: tool({
    description:
      'Trigger the generation of a detailed analysis report. Use this when the user wants a structured summary of their progress.',
    inputSchema: z.object({
      type: z
        .enum(
          settings.nutritionTrackingEnabled
            ? ['WEEKLY_TRAINING', 'LAST_3_WORKOUTS', 'LAST_3_NUTRITION', 'WEEKLY_NUTRITION']
            : ['WEEKLY_TRAINING', 'LAST_3_WORKOUTS']
        )
        .describe('The type of report to generate')
    }),
    needsApproval: false,
    execute: async ({ type }) => {
      // Final check in case the model hallucinates a disabled option
      if (type.includes('NUTRITION') && !settings.nutritionTrackingEnabled) {
        return {
          error:
            'Nutrition tracking is currently disabled. Please enable it in your settings to generate nutrition reports.'
        }
      }

      const TEMPLATE_MAP: Record<string, string> = {
        LAST_3_WORKOUTS: '00000000-0000-0000-0000-000000000001',
        WEEKLY_TRAINING: '00000000-0000-0000-0000-000000000002',
        LAST_3_NUTRITION: '00000000-0000-0000-0000-000000000003',
        WEEKLY_NUTRITION: '00000000-0000-0000-0000-000000000004'
      }

      const templateId = TEMPLATE_MAP[type]
      if (!templateId) return { error: `Invalid report type: ${type}` }

      // Create report record
      const report = await prisma.report.create({
        data: {
          userId,
          type: type.includes('NUTRITION') ? 'NUTRITION_ANALYSIS' : 'TRAINING_ANALYSIS',
          status: 'PENDING',
          dateRangeStart: getStartOfDaysAgoUTC(timezone, type.includes('WEEKLY') ? 7 : 30),
          dateRangeEnd: new Date(),
          templateId
        }
      })

      try {
        await generateReportTask.trigger(
          { userId, reportId: report.id, templateId },
          {
            tags: [`user:${userId}`, `report:${report.id}`],
            concurrencyKey: userId
          }
        )
        return {
          success: true,
          report_id: report.id,
          message: `${type.replace('_', ' ')} report generation has started and will be available in your reports section shortly.`
        }
      } catch (e: any) {
        return { error: `Failed to trigger report generation: ${e.message}` }
      }
    }
  }),

  create_chart: tool({
    description: 'Generate a chart visualization for the chat UI.',
    inputSchema: z
      .object({
        type: z
          .enum([
            'line',
            'bar',
            'doughnut',
            'radar',
            'scatter',
            'area',
            'stackedBar',
            'bubble',
            'mixed'
          ])
          .describe('Type of chart'),
        title: z.string(),
        labels: z.array(z.string()).optional().default([]).describe('X-axis labels'),
        datasets: z.array(
          z.object({
            label: z.string(),
            type: z.enum(['line', 'bar']).optional(),
            data: z.array(
              z.union([
                z.number(),
                z.object({
                  x: z.number(),
                  y: z.number(),
                  r: z.number().optional()
                })
              ])
            ),
            color: z.string().optional(),
            backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
            borderColor: z.union([z.string(), z.array(z.string())]).optional(),
            borderWidth: z.number().optional(),
            tension: z.number().optional(),
            fill: z.boolean().optional(),
            pointRadius: z.number().optional(),
            pointHoverRadius: z.number().optional(),
            yAxisID: z.string().optional(),
            borderDash: z.array(z.number()).optional()
          })
        ),
        options: z.record(z.string(), z.any()).optional()
      })
      .superRefine((value, ctx) => {
        const isScatter = value.type === 'scatter'
        const isBubble = value.type === 'bubble'
        const requiresObjectPoints = isScatter || isBubble
        const requiresLabels = !isScatter && !isBubble
        const isMixed = value.type === 'mixed'

        for (const [index, dataset] of value.datasets.entries()) {
          const hasObjectPoints = dataset.data.some(
            (point) => typeof point === 'object' && point !== null
          )
          const hasNumericPoints = dataset.data.some((point) => typeof point === 'number')

          if (requiresObjectPoints) {
            if (hasNumericPoints) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['datasets', index, 'data'],
                message: `${value.type} charts require { x, y } point objects.`
              })
            }
          } else if (hasObjectPoints) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['datasets', index, 'data'],
              message: `${value.type} charts require numeric data points.`
            })
          }

          if (isMixed && dataset.type && dataset.type !== 'line' && dataset.type !== 'bar') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['datasets', index, 'type'],
              message: 'Mixed chart datasets only support type "line" or "bar".'
            })
          }

          if (
            requiresLabels &&
            value.labels.length > 0 &&
            dataset.data.length !== value.labels.length
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['datasets', index, 'data'],
              message: 'Dataset length must match labels length.'
            })
          }
        }
      }),
    execute: async (args) => {
      return { success: true, ...args }
    }
  })
})
