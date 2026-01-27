import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { getStartOfDayUTC, getEndOfDayUTC, formatUserDate } from '../../utils/date'

export const nutritionTools = (userId: string, timezone: string) => ({
  get_nutrition_log: tool({
    description:
      'Get nutrition data for specific dates. Use this when the user asks about their eating, meals, macros, or calories.',
    inputSchema: z.object({
      start_date: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      end_date: z
        .string()
        .optional()
        .describe('End date in ISO format (YYYY-MM-DD). If not provided, defaults to start_date')
    }),
    execute: async ({ start_date, end_date }) => {
      const startParts = start_date.split('-')
      const localStartDate = new Date(
        parseInt(startParts[0]!),
        parseInt(startParts[1]!) - 1,
        parseInt(startParts[2]!)
      )
      const start = getStartOfDayUTC(timezone, localStartDate)

      let end: Date
      if (end_date) {
        const endParts = end_date.split('-')
        const localEndDate = new Date(
          parseInt(endParts[0]!),
          parseInt(endParts[1]!) - 1,
          parseInt(endParts[2]!)
        )
        end = getEndOfDayUTC(timezone, localEndDate)
      } else {
        end = getEndOfDayUTC(timezone, localStartDate)
      }

      const nutritionEntries = await prisma.nutrition.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end
          }
        },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          fiber: true,
          sugar: true,
          aiAnalysis: true
        }
      })

      if (nutritionEntries.length === 0) {
        return { message: 'No nutrition data found for the specified date range' }
      }

      return {
        count: nutritionEntries.length,
        date_range: {
          start: start_date,
          end: end_date || start_date
        },
        entries: nutritionEntries.map((entry) => ({
          id: entry.id,
          date: formatUserDate(entry.date, timezone),
          macros: {
            calories: entry.calories,
            protein: entry.protein ? Math.round(entry.protein) : null,
            carbs: entry.carbs ? Math.round(entry.carbs) : null,
            fat: entry.fat ? Math.round(entry.fat) : null,
            fiber: entry.fiber ? Math.round(entry.fiber) : null,
            sugar: entry.sugar ? Math.round(entry.sugar) : null
          },
          ai_analysis: entry.aiAnalysis || null
        })),
        totals: {
          calories: nutritionEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
          protein: nutritionEntries.reduce((sum, e) => sum + (e.protein || 0), 0),
          carbs: nutritionEntries.reduce((sum, e) => sum + (e.carbs || 0), 0),
          fat: nutritionEntries.reduce((sum, e) => sum + (e.fat || 0), 0)
        }
      }
    }
  })
})
