import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'
import { getStartOfDayUTC, getEndOfDayUTC, formatUserDate, formatDateUTC } from '../../utils/date'

// Helper to calculate totals from all meals
const recalculateDailyTotals = (nutrition: any) => {
  const meals = ['breakfast', 'lunch', 'dinner', 'snacks']
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let fiber = 0
  let sugar = 0

  for (const meal of meals) {
    const items = (nutrition[meal] as any[]) || []
    for (const item of items) {
      calories += item.calories || 0
      protein += item.protein || 0
      carbs += item.carbs || 0
      fat += item.fat || 0
      fiber += item.fiber || 0
      sugar += item.sugar || 0
    }
  }

  return { calories, protein, carbs, fat, fiber, sugar }
}

export const nutritionTools = (userId: string, timezone: string) => ({
  get_nutrition_log: tool({
    description:
      'Get nutrition data for specific dates. Use this when the user asks about their eating, meals, macros, or calories. Returns detailed meal logs.',
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
          breakfast: true,
          lunch: true,
          dinner: true,
          snacks: true,
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
          date: formatDateUTC(entry.date),
          macros: {
            calories: entry.calories,
            protein: entry.protein ? Math.round(entry.protein) : null,
            carbs: entry.carbs ? Math.round(entry.carbs) : null,
            fat: entry.fat ? Math.round(entry.fat) : null,
            fiber: entry.fiber ? Math.round(entry.fiber) : null,
            sugar: entry.sugar ? Math.round(entry.sugar) : null
          },
          meals: {
            breakfast: entry.breakfast,
            lunch: entry.lunch,
            dinner: entry.dinner,
            snacks: entry.snacks
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
  }),

  log_nutrition_meal: tool({
    description:
      'Log food items to a specific meal (breakfast, lunch, dinner, snacks). Call this when the user says "I ate X" or "Add X to my lunch". The AI should estimate macros for the items if not provided.',
    inputSchema: z.object({
      date: z.string().describe('Date in ISO format (YYYY-MM-DD)'),
      meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).describe('The meal category'),
      items: z.array(
        z.object({
          name: z.string().describe('Name of the food item'),
          calories: z.number().describe('Calories'),
          protein: z.number().describe('Protein in grams'),
          carbs: z.number().describe('Carbs in grams'),
          fat: z.number().describe('Fat in grams'),
          fiber: z.number().optional().describe('Fiber in grams'),
          sugar: z.number().optional().describe('Sugar in grams'),
          quantity: z.string().optional().describe('Quantity description (e.g. "1 cup", "100g")')
        })
      )
    }),
    execute: async ({ date, meal_type, items }) => {
      const dateParts = date.split('-')
      const localDate = new Date(
        parseInt(dateParts[0]!),
        parseInt(dateParts[1]!) - 1,
        parseInt(dateParts[2]!)
      )
      const dateUtc = getStartOfDayUTC(timezone, localDate)

      // Get existing record or create new
      let nutrition = await prisma.nutrition.findUnique({
        where: {
          userId_date: {
            userId,
            date: dateUtc
          }
        }
      })

      if (!nutrition) {
        nutrition = await prisma.nutrition.create({
          data: {
            userId,
            date: dateUtc,
            [meal_type]: items
          }
        })
      } else {
        // Append items to existing meal
        const currentItems = (nutrition[meal_type] as any[]) || []
        const updatedItems = [...currentItems, ...items]

        nutrition = await prisma.nutrition.update({
          where: { id: nutrition.id },
          data: {
            [meal_type]: updatedItems
          }
        })
      }

      // Recalculate daily totals
      const totals = recalculateDailyTotals(nutrition)

      // Update totals in DB
      const updatedNutrition = await prisma.nutrition.update({
        where: { id: nutrition.id },
        data: {
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          sugar: totals.sugar
        }
      })

      return {
        message: `Successfully logged ${items.length} item(s) to ${meal_type} for ${date}`,
        totals: {
          calories: updatedNutrition.calories,
          protein: Math.round(updatedNutrition.protein || 0),
          carbs: Math.round(updatedNutrition.carbs || 0),
          fat: Math.round(updatedNutrition.fat || 0)
        },
        current_meal_items: updatedNutrition[meal_type]
      }
    }
  }),

  delete_nutrition_item: tool({
    description:
      'Delete a specific food item from a meal or clear an entire meal. Use when user says "Remove the apple" or "Clear breakfast".',
    inputSchema: z.object({
      date: z.string().describe('Date in ISO format (YYYY-MM-DD)'),
      meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).describe('The meal category'),
      item_name: z
        .string()
        .optional()
        .describe(
          'Name of the item to remove. If omitted, the ENTIRE meal will be cleared. Matching is case-insensitive.'
        )
    }),
    execute: async ({ date, meal_type, item_name }) => {
      const dateParts = date.split('-')
      const localDate = new Date(
        parseInt(dateParts[0]!),
        parseInt(dateParts[1]!) - 1,
        parseInt(dateParts[2]!)
      )
      const dateUtc = getStartOfDayUTC(timezone, localDate)

      let nutrition = await prisma.nutrition.findUnique({
        where: {
          userId_date: {
            userId,
            date: dateUtc
          }
        }
      })

      if (!nutrition) {
        return { message: 'No nutrition log found for this date.' }
      }

      const currentItems = (nutrition[meal_type] as any[]) || []
      let updatedItems: any[] = []
      let message = ''

      if (item_name) {
        // Remove specific item (filter out matches)
        const initialLength = currentItems.length
        updatedItems = currentItems.filter(
          (item: any) => item.name.toLowerCase() !== item_name.toLowerCase()
        )
        const removedCount = initialLength - updatedItems.length
        if (removedCount === 0) {
          return {
            message: `Could not find item "${item_name}" in ${meal_type}. Found: ${currentItems.map((i) => i.name).join(', ')}`
          }
        }
        message = `Removed "${item_name}" from ${meal_type}.`
      } else {
        // Clear entire meal
        updatedItems = []
        message = `Cleared all items from ${meal_type}.`
      }

      // Update meal items
      nutrition = await prisma.nutrition.update({
        where: { id: nutrition.id },
        data: {
          [meal_type]: updatedItems
        }
      })

      // Recalculate totals
      const totals = recalculateDailyTotals(nutrition)

      // Update totals in DB
      const updatedNutrition = await prisma.nutrition.update({
        where: { id: nutrition.id },
        data: {
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          sugar: totals.sugar
        }
      })

      return {
        message,
        totals: {
          calories: updatedNutrition.calories,
          protein: Math.round(updatedNutrition.protein || 0),
          carbs: Math.round(updatedNutrition.carbs || 0),
          fat: Math.round(updatedNutrition.fat || 0)
        },
        remaining_items: updatedItems
      }
    }
  })
})
