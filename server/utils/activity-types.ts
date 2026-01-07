export const WORKOUT_ICONS: Record<string, string> = {
  'Ride': 'i-heroicons-bolt',
  'VirtualRide': 'i-heroicons-bolt',
  'Run': 'i-heroicons-fire',
  'Swim': 'i-heroicons-lifebuoy',
  'Gym': 'i-heroicons-trophy',
  'WeightTraining': 'i-heroicons-trophy',
  'Rest': 'i-heroicons-moon',
  'Active Recovery': 'i-heroicons-arrow-path-rounded-square',
  'Walk': 'i-heroicons-footprints',
  'Hike': 'i-heroicons-map',
  'Yoga': 'i-heroicons-sparkles'
}

export const WORKOUT_COLORS: Record<string, string> = {
  'Ride': 'text-green-500',
  'VirtualRide': 'text-green-500',
  'Run': 'text-orange-500',
  'Swim': 'text-cyan-500',
  'Gym': 'text-purple-500',
  'WeightTraining': 'text-purple-500',
  'Rest': 'text-gray-400',
  'Active Recovery': 'text-blue-400',
  'Walk': 'text-teal-500',
  'Hike': 'text-emerald-600',
  'Yoga': 'text-rose-500'
}

export function getWorkoutIcon(type: string): string {
  return WORKOUT_ICONS[type] || 'i-heroicons-question-mark-circle'
}

export function getWorkoutColorClass(type: string): string {
  return WORKOUT_COLORS[type] || 'text-gray-400'
}
