import { getServerSession } from '../../utils/session'
import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../../utils/db'
import { getUserTimezone, getStartOfDaysAgoUTC, getStartOfYearUTC } from '../../utils/date'
import { checkQuota } from '../../utils/quotas/engine'

defineRouteMeta({
  openAPI: {
    tags: ['Reports'],
    summary: 'Generate report',
    description: 'Triggers a background job to generate a new analysis report.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'WEEKLY_ANALYSIS',
                  'LAST_3_WORKOUTS',
                  'LAST_3_NUTRITION',
                  'LAST_7_NUTRITION',
                  'CUSTOM'
                ],
                default: 'WEEKLY_ANALYSIS'
              },
              config: {
                type: 'object',
                description: 'Optional custom configuration for CUSTOM report type'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                reportId: { type: 'string' },
                reportType: { type: 'string' },
                jobId: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid report type' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id

  // 0. Quota Check
  await checkQuota(userId, 'unified_report_generation')

  const body = await readBody(event)
  const reportType = body.type || 'WEEKLY_ANALYSIS'
  const customConfig = body.config // Custom configuration from the form
  const templateId = body.templateId // Direct template reference

  // Mapping of legacy types to new template IDs
  const LEGACY_TEMPLATE_MAP: Record<string, string> = {
    LAST_3_WORKOUTS: '00000000-0000-0000-0000-000000000001',
    WEEKLY_ANALYSIS: '00000000-0000-0000-0000-000000000002'
  }

  // Resolve template ID
  const resolvedTemplateId = templateId || LEGACY_TEMPLATE_MAP[reportType]

  // Validate report type if no templateId
  const validTypes = [
    'WEEKLY_ANALYSIS',
    'LAST_3_WORKOUTS',
    'LAST_3_NUTRITION',
    'LAST_7_NUTRITION',
    'CUSTOM'
  ]
  if (!resolvedTemplateId && !validTypes.includes(reportType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid report type. Must be one of: ${validTypes.join(', ')}`
    })
  }

  // If it's a CUSTOM report without a templateId, we still use the legacy custom flow for now
  // OR we can create a system template for CUSTOM if it doesn't exist.
  // For now, let's stick to the unified trigger for EVERYTHING that has a template.

  // Determine date range based on report type or custom config
  const timezone = await getUserTimezone(userId)
  let dateRangeStart: Date
  let dateRangeEnd = new Date()
  let reportConfig: any = null

  if (reportType === 'CUSTOM' && customConfig) {
    // ... custom config logic remains same ...
    reportConfig = customConfig
    if (customConfig.timeframeType === 'days') {
      const days = customConfig.days || 7
      dateRangeStart = getStartOfDaysAgoUTC(timezone, days)
    } else if (customConfig.timeframeType === 'ytd') {
      dateRangeStart = getStartOfYearUTC(timezone)
    } else if (customConfig.timeframeType === 'count') {
      dateRangeStart = getStartOfDaysAgoUTC(timezone, 90)
    } else if (customConfig.timeframeType === 'range') {
      dateRangeStart = new Date(customConfig.startDate)
      dateRangeEnd = new Date(customConfig.endDate)
    } else {
      dateRangeStart = getStartOfDaysAgoUTC(timezone, 7)
    }
  } else if (reportType === 'LAST_3_WORKOUTS') {
    dateRangeStart = getStartOfDaysAgoUTC(timezone, 30)
  } else if (reportType === 'LAST_3_NUTRITION') {
    dateRangeStart = getStartOfDaysAgoUTC(timezone, 3)
  } else if (reportType === 'LAST_7_NUTRITION') {
    dateRangeStart = getStartOfDaysAgoUTC(timezone, 7)
  } else {
    dateRangeStart = getStartOfDaysAgoUTC(timezone, 7)
  }

  // Create report record
  const reportData: any = {
    userId,
    type: reportType,
    status: 'PENDING',
    dateRangeStart,
    dateRangeEnd,
    templateId: resolvedTemplateId
  }

  if (reportConfig) {
    reportData.analysisJson = { _customConfig: reportConfig }
  }

  const report = await prisma.report.create({
    data: reportData
  })

  try {
    // Trigger background job
    let handle

    if (resolvedTemplateId) {
      // USE UNIFIED TRIGGER
      handle = await tasks.trigger(
        'generate-report',
        {
          userId,
          reportId: report.id,
          templateId: resolvedTemplateId
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`, `template:${resolvedTemplateId}`]
        }
      )
    } else if (reportType === 'CUSTOM') {
      // Legacy Custom flow (to be refactored later if needed)
      handle = await tasks.trigger(
        'generate-custom-report',
        {
          userId,
          reportId: report.id,
          config: reportConfig
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        }
      )
    } else if (reportType === 'LAST_3_NUTRITION') {
      handle = await tasks.trigger(
        'analyze-last-3-nutrition',
        {
          userId,
          reportId: report.id
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        }
      )
    } else if (reportType === 'LAST_7_NUTRITION') {
      handle = await tasks.trigger(
        'analyze-last-7-nutrition',
        {
          userId,
          reportId: report.id
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        }
      )
    } else {
      // Fallback to weekly analysis
      handle = await tasks.trigger(
        'generate-weekly-report',
        {
          userId,
          reportId: report.id
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        }
      )
    }

    return {
      success: true,
      reportId: report.id,
      reportType,
      jobId: handle.id,
      message: 'Report generation started'
    }
  } catch (error) {
    // Update report status to failed
    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'FAILED' }
    })

    throw createError({
      statusCode: 500,
      message: `Failed to trigger report generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
