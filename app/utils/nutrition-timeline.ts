import { addMinutes, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'

export type WindowType =
  | 'PRE_WORKOUT'
  | 'INTRA_WORKOUT'
  | 'POST_WORKOUT'
  | 'TRANSITION'
  | 'DAILY_BASE'

export interface TimelineItem {
  id: string
  name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  logged_at?: string
  source?: string
}

export interface FuelingTimelineWindow {
  type: WindowType
  startTime: Date
  endTime: Date
  targetCarbs: number
  targetProtein: number
  targetFat: number
  targetFluid?: number
  targetSodium?: number
  description: string
  items: any[]
  plannedWorkoutId?: string
  workoutTitle?: string
  fuelState?: number
  supplements?: string[]
}

export interface TimelineOptions {
  preWorkoutWindow: number // minutes
  postWorkoutWindow: number // minutes
  baseProteinPerKg: number
  baseFatPerKg: number
  weight: number
}

/**
 * Maps nutrition record and planned workouts to a unified timeline
 */
export function mapNutritionToTimeline(
  nutritionRecord: any,
  workouts: any[],
  options: TimelineOptions
): FuelingTimelineWindow[] {
  const dayStart = startOfDay(new Date(nutritionRecord.date))
  const dayEnd = endOfDay(new Date(nutritionRecord.date))
  const fuelingPlan = nutritionRecord.fuelingPlan

  let finalTimeline: FuelingTimelineWindow[] = []

  if (fuelingPlan?.windows?.length > 0) {
    // 1. Use the pre-calculated windows from the API
    finalTimeline = fuelingPlan.windows.map((w: any) => ({
      ...w,
      startTime: new Date(w.startTime),
      endTime: new Date(w.endTime),
      items: []
    }))

    // 2. Add Daily Base gaps
    const withGaps: FuelingTimelineWindow[] = []
    let lastTime = dayStart

    finalTimeline
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .forEach((window) => {
        if (window.startTime > lastTime) {
          withGaps.push({
            type: 'DAILY_BASE',
            startTime: lastTime,
            endTime: window.startTime,
            targetCarbs: 0,
            targetProtein: 0,
            targetFat: 0,
            description: 'Daily baseline',
            items: []
          })
        }
        withGaps.push(window)
        lastTime = window.endTime
      })

    if (lastTime < dayEnd) {
      withGaps.push({
        type: 'DAILY_BASE',
        startTime: lastTime,
        endTime: dayEnd,
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        description: 'Daily baseline',
        items: []
      })
    }
    finalTimeline = withGaps
  } else {
    // 3. Fallback: Manual generation if no plan exists
    // (Existing logic preserved here)
    const rawWindows: FuelingTimelineWindow[] = []
    workouts.forEach((workout) => {
      const workoutStart = workout.startTime
        ? new Date(workout.startTime)
        : new Date(new Date(workout.date).setUTCHours(10, 0, 0, 0))
      const durationMin = (workout.durationSec || 3600) / 60
      const workoutEnd = addMinutes(workoutStart, durationMin)

      // Pre-Workout
      rawWindows.push({
        type: 'PRE_WORKOUT',
        startTime: addMinutes(workoutStart, -options.preWorkoutWindow),
        endTime: workoutStart,
        targetCarbs: Math.round(options.weight * 1.5),
        targetProtein: 20,
        targetFat: 10,
        description: 'Pre-workout fueling',
        items: [],
        workoutTitle: workout.title
      })

      // Intra-Workout
      rawWindows.push({
        type: 'INTRA_WORKOUT',
        startTime: workoutStart,
        endTime: workoutEnd,
        targetCarbs: Math.round((workout.workIntensity > 0.8 ? 90 : 60) * (durationMin / 60)),
        targetProtein: 0,
        targetFat: 0,
        targetFluid: Math.round(800 * (durationMin / 60)),
        targetSodium: Math.round(600 * (durationMin / 60)),
        description: 'During workout',
        items: [],
        workoutTitle: workout.title
      })

      // Post-Workout
      rawWindows.push({
        type: 'POST_WORKOUT',
        startTime: workoutEnd,
        endTime: addMinutes(workoutEnd, options.postWorkoutWindow),
        targetCarbs: Math.round(options.weight * 1.2),
        targetProtein: 30,
        targetFat: 15,
        description: 'Post-workout recovery',
        items: [],
        workoutTitle: workout.title
      })
    })

    // Merge overlaps for manual generation
    if (rawWindows.length > 0) {
      rawWindows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

      const first = rawWindows[0]
      if (first) {
        let current: FuelingTimelineWindow = { ...first }
        const merged: FuelingTimelineWindow[] = []

        for (let i = 1; i < rawWindows.length; i++) {
          const next = rawWindows[i]
          if (!next) continue

          if (next.startTime < current.endTime) {
            current.endTime = new Date(Math.max(current.endTime.getTime(), next.endTime.getTime()))
            current.targetCarbs = (current.targetCarbs || 0) + (next.targetCarbs || 0)
            current.targetProtein = (current.targetProtein || 0) + (next.targetProtein || 0)
            current.type = 'TRANSITION'
            current.description = `Transition window`
          } else {
            merged.push({ ...current })
            current = { ...next }
          }
        }
        merged.push({ ...current })

        // Add daily base gaps to manual generation
        let lastTime = dayStart
        merged.forEach((window) => {
          if (window.startTime > lastTime) {
            finalTimeline.push({
              type: 'DAILY_BASE',
              startTime: lastTime,
              endTime: window.startTime,
              targetCarbs: 0,
              targetProtein: 0,
              targetFat: 0,
              description: 'Daily baseline',
              items: []
            })
          }
          finalTimeline.push(window)
          lastTime = window.endTime
        })
        if (lastTime < dayEnd) {
          finalTimeline.push({
            type: 'DAILY_BASE',
            startTime: lastTime,
            endTime: dayEnd,
            targetCarbs: 0,
            targetProtein: 0,
            targetFat: 0,
            description: 'Daily baseline',
            items: []
          })
        }
      }
    } else {
      // Just one big Daily Base if no workouts
      finalTimeline.push({
        type: 'DAILY_BASE',
        startTime: dayStart,
        endTime: dayEnd,
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        description: 'Rest day baseline',
        items: []
      })
    }
  }

  // 4. Slot logged items into windows
  const meals = ['breakfast', 'lunch', 'dinner', 'snacks']
  const allLoggedItems: any[] = []
  meals.forEach((meal) => {
    if (Array.isArray(nutritionRecord[meal])) {
      allLoggedItems.push(...nutritionRecord[meal].map((item: any) => ({ ...item, meal })))
    }
  })

  allLoggedItems.forEach((item) => {
    const itemTime = item.logged_at ? new Date(item.logged_at) : null

    if (itemTime) {
      const window = finalTimeline.find((w) => itemTime >= w.startTime && itemTime < w.endTime)
      if (window) {
        window.items.push(item)
      } else {
        const baseWindow = finalTimeline.find(
          (w) => w.type === 'DAILY_BASE' && itemTime >= w.startTime && itemTime < w.endTime
        )
        if (baseWindow) baseWindow.items.push(item)
      }
    } else {
      // Heuristic for items without timestamps
      if (item.meal === 'breakfast') {
        const first = finalTimeline[0]
        if (first) first.items.push(item)
      } else if (item.meal === 'dinner') {
        const last = finalTimeline[finalTimeline.length - 1]
        if (last) last.items.push(item)
      } else {
        const middle =
          finalTimeline.find((w) => w.type === 'DAILY_BASE' && w.startTime.getHours() > 10) ||
          finalTimeline[0]
        if (middle) middle.items.push(item)
      }
    }
  })

  return finalTimeline
}
