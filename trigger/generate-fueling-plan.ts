import { task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { calculateFuelingStrategy } from '../server/utils/nutrition/fueling'
import { getUserNutritionSettings } from '../server/utils/nutrition/settings'
import { getStartOfDayUTC, getUserTimezone } from '../server/utils/date'

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
    // Need timezone to get correct start of day
    const timezone = await getUserTimezone(userId)
    const targetDateStart = getStartOfDayUTC(timezone, new Date(date))

    const existingNutrition = await prisma.nutrition.findUnique({
      where: { userId_date: { userId, date: targetDateStart } }
    })

    if (existingNutrition?.isManualLock) {
      console.log(`Nutrition for ${date} is locked by user. Skipping auto-update.`)
      return
    }

    const settings = await getUserNutritionSettings(userId)

    // 3. Calculate Strategy
    // Map settings to profile interface expected by calculator
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const profile = {
      weight: user?.weight || 75,
      ftp: user?.ftp || 250,
      currentCarbMax: settings.currentCarbMax,
      sodiumTarget: settings.sodiumTarget,
      sweatRate: settings.sweatRate || 0.8,
      preWorkoutWindow: settings.preWorkoutWindow,
      postWorkoutWindow: settings.postWorkoutWindow
    }

    const fuelingPlan = calculateFuelingStrategy(profile, {
      ...workout,
      strategyOverride: workout.fuelingStrategy || undefined
    })

    // 4. Update Nutrition Record
    await prisma.nutrition.upsert({
      where: { userId_date: { userId, date: targetDateStart } },
      create: {
        userId,
        date: targetDateStart,
        fuelingPlan: fuelingPlan as any, // Cast to Json
        sourcePrecedence: 'AI',
        caloriesGoal: fuelingPlan.dailyTotals.calories,
        carbsGoal: fuelingPlan.dailyTotals.carbs,
        proteinGoal: fuelingPlan.dailyTotals.protein,
        fatGoal: fuelingPlan.dailyTotals.fat
      },
      update: {
        fuelingPlan: fuelingPlan as any,
        sourcePrecedence: 'AI',
        // Only update goals if not locked (checked above, but double check logic if partial)
        caloriesGoal: fuelingPlan.dailyTotals.calories,
        carbsGoal: fuelingPlan.dailyTotals.carbs,
        proteinGoal: fuelingPlan.dailyTotals.protein,
        fatGoal: fuelingPlan.dailyTotals.fat
      }
    })

    return {
      success: true,
      plan: fuelingPlan
    }
  }
})
