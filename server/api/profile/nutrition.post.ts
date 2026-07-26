import { z } from 'zod/v3'
import { requireAuth } from '../../utils/auth-guard'
import { nutritionSettingsRepository } from '../../utils/repositories/nutritionSettingsRepository'
import { metabolicService } from '../../utils/services/metabolicService'
import { getUserLocalDate, getUserTimezone } from '../../utils/date'
import { isNutritionTrackingEnabled } from '../../utils/nutrition/feature'
import {
  validateFuelStates,
  validateMealPattern,
  type SettingsIssue
} from '../../utils/nutrition/settings-validation'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Update nutrition settings',
    description:
      'Upserts nutrition calibration settings. When tracking is on, recalculates fueling plans for today and the next 13 days.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Updated nutrition settings' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' }
    }
  }
})

const SETTINGS_RECALC_DAYS = 14

const updateSchema = z.object({
  nutritionTrackingEnabled: z.boolean().optional(),
  bmr: z.number().min(500).max(5000).optional(),
  activityLevel: z
    .enum([
      'SEDENTARY',
      'LIGHTLY_ACTIVE',
      'ACTIVE',
      'MODERATELY_ACTIVE',
      'VERY_ACTIVE',
      'EXTRA_ACTIVE'
    ])
    .optional(),
  baseCaloriesMode: z.enum(['AUTO', 'MANUAL_NON_EXERCISE']).optional(),
  nonExerciseBaseCalories: z.number().min(800).max(6000).optional().nullable(),
  currentCarbMax: z.number().min(0).max(150),
  ultimateCarbGoal: z.number().min(0).max(150),
  baseProteinPerKg: z.number().min(0.5).max(3.0).optional(),
  baseFatPerKg: z.number().min(0.2).max(2.5).optional(),
  sweatRate: z.number().min(0).max(5).optional(),
  sodiumTarget: z.number().min(0).max(2000).optional(),
  quickAddVolumes: z.array(z.number().int().min(50).max(2000)).length(3).optional(),
  preWorkoutWindow: z.number().min(0).max(240).optional(),
  postWorkoutWindow: z.number().min(0).max(240).optional(),
  carbsPerHourLow: z.number().min(0).max(120).optional(),
  carbsPerHourMedium: z.number().min(0).max(120).optional(),
  carbsPerHourHigh: z.number().min(0).max(150).optional(),
  carbScalingFactor: z.number().min(0.5).max(2.0).optional(),
  fuelingSensitivity: z.number().min(0.5).max(1.5).optional(),
  fuelState1Trigger: z.number().min(0).max(1.0).optional(),
  fuelState1Min: z.number().min(0).max(20).optional(),
  fuelState1Max: z.number().min(0).max(20).optional(),
  fuelState2Trigger: z.number().min(0).max(1.0).optional(),
  fuelState2Min: z.number().min(0).max(20).optional(),
  fuelState2Max: z.number().min(0).max(20).optional(),
  fuelState3Min: z.number().min(0).max(25).optional(),
  fuelState3Max: z.number().min(0).max(25).optional(),
  metabolicFloor: z.number().min(0.1).max(0.95).optional(),
  enabledSupplements: z.array(z.string()).optional(),
  goalProfile: z.enum(['LOSE', 'MAINTAIN', 'GAIN']).optional(),
  targetAdjustmentPercent: z.number().min(-50).max(50).optional(),
  mealPattern: z.array(z.object({ name: z.string(), time: z.string() })).optional(),
  dietaryProfile: z.array(z.string()).optional(),
  foodAllergies: z.array(z.string()).optional(),
  foodIntolerances: z.array(z.string()).optional(),
  lifestyleExclusions: z.array(z.string()).optional()
})

/**
 * `message` is what the settings form shows the athlete - it reads `err.data.message` - so the
 * first issue has to be readable prose, not just a machine-shaped path.
 */
function invalidInput(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid input',
    message: issues[0]?.message || 'Invalid input',
    data: issues
  })
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw invalidInput(result.error.issues)
  }

  if (
    result.data.baseCaloriesMode === 'MANUAL_NON_EXERCISE' &&
    (result.data.nonExerciseBaseCalories === null ||
      result.data.nonExerciseBaseCalories === undefined)
  ) {
    throw invalidInput([
      {
        path: ['nonExerciseBaseCalories'],
        message: 'nonExerciseBaseCalories is required when baseCaloriesMode is MANUAL_NON_EXERCISE'
      }
    ])
  }

  // Relational checks. These settings only make sense as a set - a fuel-state trigger is legal on
  // its own and nonsensical against its neighbour - so they are validated after the shape check,
  // and against the *effective* settings: this endpoint accepts partial updates, so a request can
  // invert a pair by moving only one half of it. See docs/issues/379.
  const stored = await nutritionSettingsRepository.getByUserId(userId)
  const relationalIssues: SettingsIssue[] = [
    ...(result.data.mealPattern ? validateMealPattern(result.data.mealPattern) : []),
    ...validateFuelStates({
      fuelState1Trigger: result.data.fuelState1Trigger ?? stored?.fuelState1Trigger,
      fuelState2Trigger: result.data.fuelState2Trigger ?? stored?.fuelState2Trigger,
      fuelState1Min: result.data.fuelState1Min ?? stored?.fuelState1Min,
      fuelState1Max: result.data.fuelState1Max ?? stored?.fuelState1Max,
      fuelState2Min: result.data.fuelState2Min ?? stored?.fuelState2Min,
      fuelState2Max: result.data.fuelState2Max ?? stored?.fuelState2Max,
      fuelState3Min: result.data.fuelState3Min ?? stored?.fuelState3Min,
      fuelState3Max: result.data.fuelState3Max ?? stored?.fuelState3Max
    })
  ]

  if (relationalIssues.length > 0) {
    throw invalidInput(relationalIssues)
  }

  const {
    nutritionTrackingEnabled,
    bmr,
    activityLevel,
    baseCaloriesMode,
    nonExerciseBaseCalories,
    currentCarbMax,
    ultimateCarbGoal,
    baseProteinPerKg,
    baseFatPerKg,
    sweatRate,
    sodiumTarget,
    quickAddVolumes,
    preWorkoutWindow,
    postWorkoutWindow,
    carbsPerHourLow,
    carbsPerHourMedium,
    carbsPerHourHigh,
    carbScalingFactor,
    fuelingSensitivity,
    fuelState1Trigger,
    fuelState1Min,
    fuelState1Max,
    fuelState2Trigger,
    fuelState2Min,
    fuelState2Max,
    fuelState3Min,
    fuelState3Max,
    metabolicFloor,
    enabledSupplements,
    goalProfile,
    targetAdjustmentPercent,
    mealPattern,
    dietaryProfile,
    foodAllergies,
    foodIntolerances,
    lifestyleExclusions
  } = result.data

  // Update user model for global tracking preference
  if (nutritionTrackingEnabled !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { nutritionTrackingEnabled }
    })
  }

  const settings = await nutritionSettingsRepository.upsert(userId, {
    bmr,
    activityLevel,
    baseCaloriesMode,
    nonExerciseBaseCalories,
    currentCarbMax,
    ultimateCarbGoal,
    baseProteinPerKg,
    baseFatPerKg,
    sweatRate,
    sodiumTarget,
    quickAddVolumes,
    preWorkoutWindow,
    postWorkoutWindow,
    carbsPerHourLow,
    carbsPerHourMedium,
    carbsPerHourHigh,
    carbScalingFactor,
    fuelingSensitivity,
    fuelState1Trigger,
    fuelState1Min,
    fuelState1Max,
    fuelState2Trigger,
    fuelState2Min,
    fuelState2Max,
    fuelState3Min,
    fuelState3Max,
    metabolicFloor,
    enabledSupplements,
    goalProfile,
    targetAdjustmentPercent,
    mealPattern,
    dietaryProfile,
    foodAllergies,
    foodIntolerances,
    lifestyleExclusions
  })

  // REACTIVE: Automatically trigger fueling plan regeneration for today
  try {
    const shouldRunNutrition =
      nutritionTrackingEnabled !== undefined
        ? nutritionTrackingEnabled
        : await isNutritionTrackingEnabled(userId)
    if (shouldRunNutrition) {
      const timezone = await getUserTimezone(userId)
      const today = getUserLocalDate(timezone)

      // Refresh today's plan plus upcoming days so saved settings are reflected consistently.
      // calculateFuelingPlanForDate already skips records with manual lock enabled.
      for (let offset = 0; offset < SETTINGS_RECALC_DAYS; offset++) {
        const targetDate = new Date(today)
        targetDate.setUTCDate(today.getUTCDate() + offset)
        await metabolicService.calculateFuelingPlanForDate(userId, targetDate, {
          persist: true
        })
      }
    }
  } catch (err) {
    console.error('[NutritionSettings] Failed to trigger plan regeneration:', err)
  }

  return {
    settings
  }
})
