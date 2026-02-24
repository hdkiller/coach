import { prisma } from './db'
import { workoutRepository } from './repositories/workoutRepository'
import { wellnessRepository } from './repositories/wellnessRepository'
import { nutritionRepository } from './repositories/nutritionRepository'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'
import {
  getUserTimezone,
  getStartOfDaysAgoUTC,
  getEndOfDayUTC,
  formatUserDate,
  calculateAge
} from './date'
import { buildWorkoutSummary, buildMetricsSummary } from './gemini'

/**
 * Fetches data for a report based on the template input configuration.
 * Returns a context object that can be used to render prompts.
 */
export async function fetchReportContext(userId: string, inputConfig: any) {
  const timezone = await getUserTimezone(userId)
  const context: any = {
    timezone,
    user: await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        ftp: true,
        weight: true,
        maxHr: true,
        aiPersona: true,
        aiModelPreference: true,
        dob: true,
        sex: true,
        language: true,
        nutritionTrackingEnabled: true
      }
    })
  }

  // Calculate specific user fields
  if (context.user) {
    if (context.user.ftp && context.user.weight) {
      context.user.wKg = (context.user.ftp / context.user.weight).toFixed(2)
    } else {
      context.user.wKg = 'Unknown'
    }
    context.user.age = calculateAge(context.user.dob)
    context.persona = context.user.aiPersona || 'Supportive'
  }

  context.current_date = formatUserDate(new Date(), timezone, 'yyyy-MM-dd')
  context.current_day_of_week = formatUserDate(new Date(), timezone, 'EEEE')

  // Iterate through sources and fetch data
  if (inputConfig.sources && Array.isArray(inputConfig.sources)) {
    for (const source of inputConfig.sources) {
      let data: any
      const key = source.key || 'data'

      // Determine date range if specified
      let startDate: Date | undefined
      const endDate: Date = getEndOfDayUTC(timezone, new Date())

      if (source.range) {
        if (source.range.type === 'days') {
          startDate = getStartOfDaysAgoUTC(timezone, source.range.value)
        }
      }

      switch (source.entity) {
        case 'workout':
          data = await workoutRepository.getForUser(userId, {
            startDate,
            endDate,
            limit: source.limit,
            orderBy: source.orderBy || { date: 'desc' },
            includeDuplicates: false,
            include: { streams: true }
          })

          // Apply additional filters (e.g., by sport type)
          if (source.filter?.type) {
            const types = Array.isArray(source.filter.type)
              ? source.filter.type
              : [source.filter.type]
            data = data.filter((w: any) => types.includes(w.type))
          }

          context[key] = data
          context[`${key}_summary`] = buildWorkoutSummary(data, timezone)
          break

        case 'wellness':
          data = await wellnessRepository.getForUser(userId, {
            startDate,
            endDate,
            orderBy: source.orderBy || { date: 'asc' }
          })
          context[key] = data
          context[`${key}_summary`] = buildMetricsSummary(data, timezone)
          break

        case 'nutrition':
          // Only fetch nutrition data if enabled
          if (context.user?.nutritionTrackingEnabled) {
            data = await nutritionRepository.getForUser(userId, {
              startDate,
              endDate,
              limit: source.limit,
              orderBy: source.orderBy || { date: 'desc' }
            })

            // Filter days with data
            data = data.filter((n: any) => n.calories != null)

            context[key] = data
            context[`${key}_summary`] = buildNutritionSummary(data, timezone)
          } else {
            // If disabled, provide empty/placeholder values
            context[key] = []
            context[`${key}_summary`] =
              'Nutrition tracking is disabled. No nutrition data to display.'
          }
          break

        case 'sport_settings': {
          data = await sportSettingsRepository.getForActivityType(
            userId,
            source.activityType || 'Ride'
          )
          context[key] = data

          // Build settings context string for prompt
          let settingsStr = ''
          if (data) {
            if (data.hrZones && Array.isArray(data.hrZones)) {
              settingsStr += `Heart Rate Zones:\n${data.hrZones.map((z: any) => `- ${z.name}: ${z.min}-${z.max} bpm`).join('\n')}\n`
            }
            if (data.powerZones && Array.isArray(data.powerZones)) {
              settingsStr += `Power Zones:\n${data.powerZones.map((z: any) => `- ${z.name}: ${z.min}-${z.max} W`).join('\n')}\n`
            }
          }
          context[`${key}_context`] = settingsStr
          break
        }

        case 'goal':
          data = await prisma.goal.findMany({
            where: {
              userId,
              ...(source.filter || {})
            }
          })
          context[key] = data

          // Build goals context string
          context[`${key}_context`] =
            data.length > 0
              ? `CURRENT GOALS (for context):\n${data.map((g: any) => `- [${g.priority}] ${g.title} (${g.type})`).join('\n')}`
              : ''
          break
      }
    }
  }

  return context
}

/**
 * Build a summary of nutrition data for the prompt
 */
export function buildNutritionSummary(nutritionDays: any[], timezone: string) {
  return nutritionDays
    .map((day, idx) => {
      const dayNum = nutritionDays.length - idx
      const dateStr = formatUserDate(day.date, timezone, 'EEE, MMM d')

      return `Day ${dayNum} (${dateStr}):
- Calories: ${day.calories || 'N/A'}${day.caloriesGoal ? ` / ${day.caloriesGoal} goal` : ''} (${day.caloriesGoal && day.calories ? Math.round((day.calories / day.caloriesGoal) * 100) + '%' : 'N/A'})
- Protein: ${day.protein || 'N/A'}g${day.proteinGoal ? ` / ${day.proteinGoal}g goal` : ''} (${day.proteinGoal && day.protein ? Math.round((day.protein / day.proteinGoal) * 100) + '%' : 'N/A'})
- Carbs: ${day.carbs || 'N/A'}g${day.carbsGoal ? ` / ${day.carbsGoal}g goal` : ''}
- Fat: ${day.fat || 'N/A'}g${day.fatGoal ? ` / ${day.fatGoal}g goal` : ''}
- Fiber: ${day.fiber || 'N/A'}g
- Water: ${day.waterMl ? `${day.waterMl}ml` : 'Not tracked'}`
    })
    .join('\n\n')
}
/**
 * Renders a prompt template by injecting values from the context.
 * Supports simple {{variable}} and {{object.property}} syntax.
 */
export function renderPrompt(template: string, context: any): string {
  if (!template) return ''

  return template.replace(/\{\{(.+?)\}\}/g, (match, path) => {
    const parts = path.trim().split('.')
    let val = context
    for (const part of parts) {
      if (val === null || val === undefined) break
      val = val[part]
    }
    return val !== undefined && val !== null ? String(val) : ''
  })
}

/**
 * Standard markdown converter for structured analysis
 */
export function convertStructuredToMarkdown(analysis: any): string {
  let markdown = `# ${analysis.title}\n\n`
  if (analysis.date) markdown += `**Period**: ${analysis.date}\n\n`
  markdown += `## Quick Take\n\n${analysis.executive_summary}\n\n`

  if (analysis.sections && analysis.sections.length > 0) {
    markdown += `## Detailed Analysis\n\n`
    for (const section of analysis.sections) {
      markdown += `### ${section.title}\n\n`
      if (section.status_label) markdown += `**Status**: ${section.status_label}\n\n`
      if (section.analysis_points && section.analysis_points.length > 0) {
        for (const point of section.analysis_points) {
          markdown += `- ${point}\n`
        }
        markdown += '\n'
      }
    }
  }

  if (analysis.recommendations && analysis.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`
    for (const rec of analysis.recommendations) {
      const priorityStr = rec.priority ? ` (${rec.priority} priority)` : ''
      markdown += `### ${rec.title}${priorityStr}\n\n`
      markdown += `${rec.description}\n\n`
    }
  }

  if (analysis.metrics_summary) {
    markdown += `## Metrics Summary\n\n`
    const metrics = analysis.metrics_summary
    if (metrics.total_duration_minutes)
      markdown += `- **Total Duration**: ${Math.round(metrics.total_duration_minutes)} minutes\n`
    if (metrics.total_tss) markdown += `- **Total TSS**: ${Math.round(metrics.total_tss)}\n`
    if (metrics.avg_power) markdown += `- **Average Power**: ${Math.round(metrics.avg_power)}W\n`
    if (metrics.avg_heart_rate)
      markdown += `- **Average HR**: ${Math.round(metrics.avg_heart_rate)} bpm\n`
    if (metrics.total_distance_km)
      markdown += `- **Total Distance**: ${metrics.total_distance_km.toFixed(1)} km\n`
  }

  return markdown
}
