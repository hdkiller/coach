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
    { key: 'distance', label: 'Distance', type: 'NUMBER', unit: 'm' },
    { key: 'calories', label: 'Calories', type: 'NUMBER', unit: 'kcal' }
  ]

  // Standard Wellness Fields
  const wellnessFields = [
    { key: 'hrv', label: 'HRV', type: 'NUMBER', unit: 'ms' },
    { key: 'restingHr', label: 'Resting HR', type: 'NUMBER', unit: 'bpm' },
    { key: 'sleepHours', label: 'Sleep Duration', type: 'NUMBER', unit: 'h' },
    { key: 'sleepScore', label: 'Sleep Score', type: 'NUMBER' },
    { key: 'weight', label: 'Weight', type: 'NUMBER', unit: 'kg' },
    { key: 'ctl', label: 'Fitness (CTL)', type: 'NUMBER' },
    { key: 'atl', label: 'Fatigue (ATL)', type: 'NUMBER' },
    { key: 'tsb', label: 'Form (TSB)', type: 'NUMBER' }
  ]

  // Fetch Custom Field Definitions
  const customFields = await prisma.customFieldDefinition.findMany({
    where: { ownerId: user.id }
  })

  const customWorkoutFields = customFields
    .filter(f => f.entityType === 'WORKOUT' && f.dataType === 'NUMBER')
    .map(f => ({
      key: `custom.${f.fieldKey}`,
      label: f.label,
      type: f.dataType,
      unit: f.unit,
      isCustom: true
    }))

  const customWellnessFields = customFields
    .filter(f => f.entityType === 'WELLNESS' && f.dataType === 'NUMBER')
    .map(f => ({
      key: `custom.${f.fieldKey}`,
      label: f.label,
      type: f.dataType,
      unit: f.unit,
      isCustom: true
    }))

  return {
    workouts: [...workoutFields, ...customWorkoutFields],
    wellness: [...wellnessFields, ...customWellnessFields],
    nutrition: [] // To be implemented
  }
})
