import { task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { calculateFuelingStrategy } from '../server/utils/nutrition/fueling'
import { getUserNutritionSettings } from '../server/utils/nutrition/settings'
import {
  getStartOfDayUTC,
  getUserTimezone,
  buildZonedDateTimeFromUtcDate
} from '../server/utils/date'
import { nutritionRepository } from '../server/utils/repositories/nutritionRepository'

export const generateFuelingPlanTask = task({
  id: 'generate-fueling-plan',
  run: async (payload: { plannedWorkoutId: string; userId: string; date: string }) => {
    const { plannedWorkoutId, userId, date } = payload

    // 1. Fetch Planned Workout & Settings
    const workout = await prisma.plannedWorkout.findUnique({
      where: { id: plannedWorkoutId }
    })

    if (!workout) {
      console.log(`Planned Workout ${plannedWorkoutId} not found. Skipping.`)
      return
    }

    // 2. Check for Manual Lock
    // The 'date' string passed is ISO UTC Midnight for the calendar day
    const targetDateStart = new Date(date)
    targetDateStart.setUTCHours(0, 0, 0, 0)
    const targetDateEnd = new Date(targetDateStart)
    targetDateEnd.setUTCHours(23, 59, 59, 999)

    const existingNutrition = await nutritionRepository.getByDate(userId, targetDateStart)

    if (existingNutrition?.isManualLock) {
      console.log(`Nutrition for ${date} is locked by user. Skipping auto-update.`)
      return
    }

    const settings = await getUserNutritionSettings(userId)
    const timezone = await getUserTimezone(userId)

    // 3. Fetch ALL workouts for this day to build a complete plan
    const allWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        userId,
        date: {
          gte: targetDateStart,
          lte: targetDateEnd
        }
      },
      orderBy: { date: 'asc' }
    })

    // Generate clusters for each workout and combine
    const combinedWindows: any[] = []
    const combinedNotes: string[] = []

    let maxDailyCarbs = 0
    let maxDailyProtein = 0
    let maxDailyFat = 0
    let totalFluid = 2000 // Base hydration
    let totalSodium = 1000 // Base sodium

    for (const work of allWorkouts) {
      // Convert HH:mm string to a Date object relative to the workout date
      let startTimeDate: Date | null = null
      if (work.startTime && typeof work.startTime === 'string' && work.startTime.includes(':')) {
        startTimeDate = buildZonedDateTimeFromUtcDate(work.date, work.startTime, timezone, 10, 0)
      } else if (work.startTime instanceof Date) {
        startTimeDate = work.startTime
      }

      const plan = calculateFuelingStrategy(profile, {
        ...work,
        startTime: startTimeDate,
        strategyOverride: work.fuelingStrategy || undefined
      } as any)

      combinedWindows.push(...plan.windows)
      combinedNotes.push(...plan.notes)

      // Use the highest daily target among all workouts (intensity-based baseline)
      if (plan.dailyTotals.carbs > maxDailyCarbs) {
        maxDailyCarbs = plan.dailyTotals.carbs
        maxDailyProtein = plan.dailyTotals.protein
        maxDailyFat = plan.dailyTotals.fat
      }

      // Add extra intra-workout hydration/sodium
      totalFluid += plan.dailyTotals.fluid - 2000
      totalSodium += plan.dailyTotals.sodium - 1000
    }

    // Deduplicate notes
    const uniqueNotes = Array.from(new Set(combinedNotes))

    const finalPlan = {
      windows: combinedWindows,
      notes: uniqueNotes,
      dailyTotals: {
        carbs: maxDailyCarbs,
        protein: maxDailyProtein,
        fat: maxDailyFat,
        calories: maxDailyCarbs * 4 + maxDailyProtein * 4 + maxDailyFat * 9,
        fluid: totalFluid,
        sodium: totalSodium
      }
    }

    // 5. Update Nutrition Record
    await nutritionRepository.upsert(
      userId,
      targetDateStart,
      {
        userId,
        date: targetDateStart,
        fuelingPlan: finalPlan as any,
        sourcePrecedence: 'AI',
        caloriesGoal: finalPlan.dailyTotals.calories,
        carbsGoal: finalPlan.dailyTotals.carbs,
        proteinGoal: finalPlan.dailyTotals.protein,
        fatGoal: finalPlan.dailyTotals.fat
      },
      {
        fuelingPlan: finalPlan as any,
        sourcePrecedence: 'AI',
        caloriesGoal: finalPlan.dailyTotals.calories,
        carbsGoal: finalPlan.dailyTotals.carbs,
        proteinGoal: finalPlan.dailyTotals.protein,
        fatGoal: finalPlan.dailyTotals.fat
      }
    )

    return {
      success: true,
      plan: finalPlan
    }
  }
})
