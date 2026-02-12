export interface FuelingWindow {
  type:
    | 'PRE_WORKOUT'
    | 'INTRA_WORKOUT'
    | 'POST_WORKOUT'
    | 'TRANSITION'
    | 'DAILY_BASE'
    | 'WORKOUT_EVENT'
    | 'general_day'
    | string
  startTime: string | Date
  endTime: string | Date
  targetCarbs: number
  targetProtein: number
  targetFat: number
  targetFluid?: number
  targetSodium?: number
  description: string
  plannedWorkoutId?: string
  workoutTitle?: string
  [key: string]: any
}

/**
 * Merges overlapping or adjacent fueling windows to prevent UI clutter and redundant targets
 */
export function mergeFuelingWindows(windows: FuelingWindow[]): FuelingWindow[] {
  if (windows.length <= 1) return windows

  // Sort by startTime
  const sorted = [...windows].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const merged: FuelingWindow[] = []
  let current: FuelingWindow = {
    ...(sorted[0] as FuelingWindow),
    startTime: new Date(sorted[0]!.startTime),
    endTime: new Date(sorted[0]!.endTime)
  }

  for (let i = 1; i < sorted.length; i++) {
    const next: FuelingWindow = sorted[i] as FuelingWindow
    if (!next) continue

    const currentStart = (current.startTime as Date).getTime()
    const currentEnd = (current.endTime as Date).getTime()
    const nextStart = new Date(next.startTime).getTime()
    const nextEnd = new Date(next.endTime).getTime()

    if (!currentStart || !nextStart) {
      merged.push(current)
      current = { ...next }
      continue
    }

    // Threshold for merging adjacent windows: 15 minutes
    const MERGE_THRESHOLD_MS = 15 * 60 * 1000

    if (nextStart <= currentEnd + MERGE_THRESHOLD_MS) {
      // OVERLAP OR CLOSE ADJACENCY detected

      const isSameType = current.type === next.type

      // Determine new end time
      current.endTime = new Date(Math.max(currentEnd, nextEnd))

      // Combine nutrition targets
      current.targetCarbs = (current.targetCarbs || 0) + (next.targetCarbs || 0)
      current.targetProtein = (current.targetProtein || 0) + (next.targetProtein || 0)
      current.targetFat = (current.targetFat || 0) + (next.targetFat || 0)
      if (next.targetFluid) current.targetFluid = (current.targetFluid || 0) + next.targetFluid
      if (next.targetSodium) current.targetSodium = (current.targetSodium || 0) + next.targetSodium

      // Update Type and Description
      if (!isSameType) {
        // If merging different types (e.g. POST overlap with next PRE)
        current.type = 'TRANSITION'
        current.description = 'Transition fueling window'
      }

      // Handle Workout IDs/Titles
      if (next.plannedWorkoutId && next.plannedWorkoutId !== current.plannedWorkoutId) {
        // If they are different workouts, we might lose one ID,
        // but we should at least note the titles if missing
        if (
          current.workoutTitle &&
          next.workoutTitle &&
          !current.workoutTitle.includes(next.workoutTitle)
        ) {
          current.workoutTitle = `${current.workoutTitle} & ${next.workoutTitle}`
        } else if (!current.workoutTitle && next.workoutTitle) {
          current.workoutTitle = next.workoutTitle
        }
      }
    } else {
      merged.push(current)
      current = {
        ...next,
        startTime: new Date(next.startTime),
        endTime: new Date(next.endTime)
      }
    }
  }

  merged.push(current)
  return merged
}
