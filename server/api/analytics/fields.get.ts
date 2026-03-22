import { requireAuth } from '../../utils/auth-guard'

defineRouteMeta({
  openAPI: {
    tags: ['Analytics'],
    summary: 'List available fields',
    description: 'Returns available standard and custom fields for analytics querying.'
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Standard Workout Fields
  const workoutFields = [
    { key: 'durationSec', label: 'Duration', type: 'NUMBER', unit: 's' },
    { key: 'tss', label: 'TSS', type: 'NUMBER' },
    { key: 'averageWatts', label: 'Avg Power', type: 'NUMBER', unit: 'W' },
    { key: 'averageHr', label: 'Avg HR', type: 'NUMBER', unit: 'bpm' },
    { key: 'distanceMeters', label: 'Distance', type: 'NUMBER', unit: 'm' },
    { key: 'intensity', label: 'Intensity', type: 'NUMBER' },
    { key: 'calories', label: 'Calories', type: 'NUMBER', unit: 'kcal' }
  ]

  // Standard Wellness Fields
  const wellnessFields = [
    { key: 'hrv', label: 'HRV', type: 'NUMBER', unit: 'ms' },
    { key: 'restingHr', label: 'Resting HR', type: 'NUMBER', unit: 'bpm' },
    { key: 'sleepHours', label: 'Sleep Duration', type: 'NUMBER', unit: 'h' },
    { key: 'sleepScore', label: 'Sleep Score', type: 'NUMBER' },
    { key: 'recoveryScore', label: 'Recovery Score', type: 'NUMBER' },
    { key: 'weight', label: 'Weight', type: 'NUMBER', unit: 'kg' },
    { key: 'ctl', label: 'Fitness (CTL)', type: 'NUMBER' },
    { key: 'atl', label: 'Fatigue (ATL)', type: 'NUMBER' },
    { key: 'tsb', label: 'Form (TSB)', type: 'NUMBER' }
  ]

  const nutritionFields = [
    { key: 'calories', label: 'Calories', type: 'NUMBER', unit: 'kcal' },
    { key: 'caloriesGoal', label: 'Calories Goal', type: 'NUMBER', unit: 'kcal' },
    { key: 'carbs', label: 'Carbs', type: 'NUMBER', unit: 'g' },
    { key: 'carbsGoal', label: 'Carbs Goal', type: 'NUMBER', unit: 'g' },
    { key: 'protein', label: 'Protein', type: 'NUMBER', unit: 'g' },
    { key: 'proteinGoal', label: 'Protein Goal', type: 'NUMBER', unit: 'g' },
    { key: 'fat', label: 'Fat', type: 'NUMBER', unit: 'g' },
    { key: 'fatGoal', label: 'Fat Goal', type: 'NUMBER', unit: 'g' },
    { key: 'fiber', label: 'Fiber', type: 'NUMBER', unit: 'g' },
    { key: 'sugar', label: 'Sugar', type: 'NUMBER', unit: 'g' },
    { key: 'waterMl', label: 'Water', type: 'NUMBER', unit: 'ml' },
    { key: 'overallScore', label: 'Overall Score', type: 'NUMBER' },
    { key: 'macroBalanceScore', label: 'Macro Balance Score', type: 'NUMBER' },
    { key: 'qualityScore', label: 'Quality Score', type: 'NUMBER' },
    { key: 'adherenceScore', label: 'Adherence Score', type: 'NUMBER' },
    { key: 'hydrationScore', label: 'Hydration Score', type: 'NUMBER' },
    {
      key: 'startingGlycogenPercentage',
      label: 'Starting Glycogen',
      type: 'NUMBER',
      unit: '%'
    },
    {
      key: 'endingGlycogenPercentage',
      label: 'Ending Glycogen',
      type: 'NUMBER',
      unit: '%'
    },
    { key: 'startingFluidDeficit', label: 'Starting Fluid Deficit', type: 'NUMBER', unit: 'L' },
    { key: 'endingFluidDeficit', label: 'Ending Fluid Deficit', type: 'NUMBER', unit: 'L' }
  ]

  // Fetch Custom Field Definitions
  const customFields = await prisma.customFieldDefinition.findMany({
    where: { ownerId: user.id }
  })

  const customWorkoutFields = customFields
    .filter((f) => f.entityType === 'WORKOUT' && f.dataType === 'NUMBER')
    .map((f) => ({
      key: `custom.${f.fieldKey}`,
      label: f.label,
      type: f.dataType,
      unit: f.unit,
      isCustom: true
    }))

  const customWellnessFields = customFields
    .filter((f) => f.entityType === 'WELLNESS' && f.dataType === 'NUMBER')
    .map((f) => ({
      key: `custom.${f.fieldKey}`,
      label: f.label,
      type: f.dataType,
      unit: f.unit,
      isCustom: true
    }))

  const customNutritionFields = customFields
    .filter((f) => f.entityType === 'NUTRITION' && f.dataType === 'NUMBER')
    .map((f) => ({
      key: `custom.${f.fieldKey}`,
      label: f.label,
      type: f.dataType,
      unit: f.unit,
      isCustom: true
    }))

  return {
    workouts: [...workoutFields, ...customWorkoutFields],
    wellness: [...wellnessFields, ...customWellnessFields],
    nutrition: [...nutritionFields, ...customNutritionFields]
  }
})
