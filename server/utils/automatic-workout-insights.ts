const AUTO_WORKOUT_INSIGHT_ALLOWED_TYPES = new Set([
  'ride',
  'cycling',
  'virtualride',
  'mountainbikeride',
  'gravelride',
  'trackride',
  'ebikeride',
  'emountainbikeride',
  'ebiking',
  'run',
  'running',
  'virtualrun',
  'trailrun',
  'swim',
  'swimming',
  'openwaterswim',
  'rowing',
  'virtualrow',
  'hike',
  'hiking',
  'nordicski',
  'crosscountryskiing',
  'rollerski',
  'alpineski',
  'ski',
  'virtualski',
  'backcountryski',
  'snowshoe',
  'elliptical',
  'stairstepper',
  'fitnessequipment',
  'weighttraining',
  'gym',
  'workout',
  'training',
  'crossfit',
  'highintensityintervaltraining',
  'hiit',
  'standuppaddling',
  'kayaking',
  'canoeing',
  'surfing',
  'kitesurf',
  'windsurf',
  'rockclimbing'
])

export function normalizeAutomaticInsightWorkoutType(type?: string | null): string {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isWorkoutEligibleForAutomaticInsights(type?: string | null): boolean {
  const normalizedType = normalizeAutomaticInsightWorkoutType(type)
  if (!normalizedType) return false
  return AUTO_WORKOUT_INSIGHT_ALLOWED_TYPES.has(normalizedType)
}
