export interface IngestionCounts {
  workouts?: number
  wellness?: number
  sleep?: number
  plannedWorkouts?: number
  events?: number
  nutrition?: number
  activity?: number
}

export interface IngestionResult {
  success: boolean
  counts: IngestionCounts
  skipped?: number
  message?: string
  error?: any
  // Contextual data
  userId?: string
  startDate?: string
  endDate?: string
}
