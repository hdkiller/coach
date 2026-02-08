import type { UserNutritionSettings } from '@prisma/client'
import { prisma } from '../db'

export const DEFAULT_NUTRITION_SETTINGS: Omit<
  UserNutritionSettings,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  bmr: 1600,
  activityLevel: 'ACTIVE',
  baseProteinPerKg: 1.6,
  baseFatPerKg: 1.0,
  currentCarbMax: 60,
  ultimateCarbGoal: 90,
  sweatRate: 0.8,
  sodiumTarget: 750,
  preWorkoutWindow: 120,
  postWorkoutWindow: 60,
  carbsPerHourLow: 30,
  carbsPerHourMedium: 60,
  carbsPerHourHigh: 90
}

export async function getUserNutritionSettings(userId: string): Promise<UserNutritionSettings> {
  const settings = await prisma.userNutritionSettings.findUnique({
    where: { userId }
  })

  if (!settings) {
    return {
      ...DEFAULT_NUTRITION_SETTINGS,
      id: 'default',
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserNutritionSettings
  }

  return settings
}
