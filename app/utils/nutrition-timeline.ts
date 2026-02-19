import { addMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

export type WindowType =
  | 'PRE_WORKOUT'
  | 'INTRA_WORKOUT'
  | 'POST_WORKOUT'
  | 'TRANSITION'
  | 'DAILY_BASE'
  | 'WORKOUT_EVENT'

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
  workout?: any // The full PlannedWorkout object
  workouts?: any[] // Array of associated workouts
  workoutIds?: string[] // Array of associated workout IDs
  fuelState?: number
  supplements?: string[]
  meals?: string[]
}

export interface TimelineOptions {
  preWorkoutWindow: number // minutes
  postWorkoutWindow: number // minutes
  baseProteinPerKg: number
  baseFatPerKg: number
  weight: number
  mealPattern?: { name: string; time: string }[]
  timezone: string
  mergeWindows?: boolean
}

export function getWorkoutDate(workout: any, timezone: string): number {
  const d = new Date(workout.date)
  if (isNaN(d.getTime())) {
    return 0
  }

  // If it's a completed workout, it usually has a precise timestamp in 'date'
  // We should trust it unless it's strictly midnight UTC (which implies a date-only field)
  const isCompleted =
    workout.source === 'completed' ||
    workout.source === 'intervals' ||
    workout.status === 'completed'
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0

  if (isCompleted && hasTime) {
    return d.getTime()
  }

  if (workout.startTime) {
    if (
      workout.startTime instanceof Date ||
      (typeof workout.startTime === 'string' && workout.startTime.includes('T'))
    ) {
      // If it's already a full date, return it
      const sd = new Date(workout.startTime)
      if (!isNaN(sd.getTime())) return sd.getTime()
    }
  }

  let h = 10
  let m = 0

  if (workout.startTime) {
    // If startTime is HH:mm string
    if (typeof workout.startTime === 'string' && workout.startTime.includes(':')) {
      const [sh, sm] = workout.startTime.split(':').map(Number)
      h = sh || 0
      m = sm || 0
    }
  }

  // Use UTC components of the base date to ensure we stay on the intended calendar day
  // This handles dates like "2026-02-11T00:00:00Z" correctly regardless of local timezone
  const dateStr = d.toISOString().split('T')[0]
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')

  try {
    return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, timezone).getTime()
  } catch (e) {
    return new Date(`${dateStr}T${hh}:${mm}:00Z`).getTime()
  }
}

export function hasMissingPlannedWorkoutStartTime(workout: any): boolean {
  if (!workout || workout.type === 'Rest' || workout.type === 'Note') return false

  const source = String(workout.source || '').toLowerCase()
  const isCompleted =
    source === 'completed' ||
    source === 'intervals' ||
    workout.status === 'completed' ||
    workout.status === 'completed_plan'

  if (isCompleted || source !== 'planned') {
    return false
  }

  const startTime = workout.startTime
  if (startTime == null) return true

  if (typeof startTime === 'string') {
    const trimmed = startTime.trim()
    if (!trimmed) return true

    if (/^00:00(?::00(?:\.\d{1,3})?)?$/.test(trimmed)) return true

    if (trimmed.includes(':')) {
      const [hRaw, mRaw, sRaw] = trimmed.split(':')
      const h = Number(hRaw)
      const m = Number(mRaw)
      const s = Number((sRaw || '0').split('.')[0])
      if (
        Number.isFinite(h) &&
        Number.isFinite(m) &&
        Number.isFinite(s) &&
        h === 0 &&
        m === 0 &&
        s === 0
      ) {
        return true
      }
    }

    if (trimmed.includes('T')) {
      const parsed = new Date(trimmed)
      if (!isNaN(parsed.getTime())) {
        const isMidnight =
          parsed.getUTCHours() === 0 && parsed.getUTCMinutes() === 0 && parsed.getUTCSeconds() === 0
        if (isMidnight) return true
      }
    }
  }

  if (startTime instanceof Date) {
    return (
      startTime.getUTCHours() === 0 &&
      startTime.getUTCMinutes() === 0 &&
      startTime.getUTCSeconds() === 0
    )
  }

  return false
}

export function countPlannedWorkoutsWithMissingStartTime(workouts: any[]): number {
  if (!Array.isArray(workouts) || workouts.length === 0) return 0
  return workouts.reduce(
    (count, workout) => count + (hasMissingPlannedWorkoutStartTime(workout) ? 1 : 0),
    0
  )
}

/**
 * Maps nutrition record and planned workouts to a unified timeline.
 * Relies on server-provided fuelingPlan for windows and targets.
 */
export function mapNutritionToTimeline(
  nutritionRecord: any,
  workouts: any[],
  options: TimelineOptions
): FuelingTimelineWindow[] {
  const trainingWorkouts = workouts.filter((w) => w.type !== 'Rest')
  const dateStr =
    nutritionRecord.date instanceof Date
      ? nutritionRecord.date.toISOString().split('T')[0]
      : nutritionRecord.date.split('T')[0]
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, options.timezone)
  const dayEnd = fromZonedTime(`${dateStr}T23:59:59`, options.timezone)
  const fuelingPlan = nutritionRecord.fuelingPlan

  let baseTimeline: FuelingTimelineWindow[] =
    fuelingPlan?.windows?.map((w: any) => {
      // 1. Find associated workout
      // First priority: Exact ID match
      let workout = trainingWorkouts.find((work) => w.plannedWorkoutId === work.id)

      // Second priority: Closest proximity for INTRA/TRANSITION windows
      if (
        !workout &&
        (w.type === 'INTRA_WORKOUT' ||
          w.type === 'TRANSITION' ||
          w.type === 'PRE_WORKOUT' ||
          w.type === 'POST_WORKOUT')
      ) {
        const wStart = new Date(w.startTime).getTime()
        const matches = trainingWorkouts
          .map((work) => ({
            work,
            diff: Math.abs(wStart - getWorkoutDate(work, options.timezone))
          }))
          .filter((m) => m.diff < 60 * 60 * 1000) // Must be within 1 hour
          .sort((a, b) => a.diff - b.diff)

        workout = matches[0]?.work
      }

      return {
        ...w,
        startTime: new Date(w.startTime),
        endTime: new Date(w.endTime),
        workout,
        workouts: workout ? [workout] : [],
        workoutTitle: w.workoutTitle || workout?.title,
        items: [],
        workoutIds: workout ? [workout.id] : w.plannedWorkoutId ? [w.plannedWorkoutId] : []
      }
    }) || []

  // 1.5. Merge Closely Timed Windows if requested
  if (options.mergeWindows) {
    const groups: FuelingTimelineWindow[] = []
    // Sort by start time to process chronologically
    baseTimeline.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    baseTimeline.forEach((window) => {
      // Find an existing group of the same type that is "nearby"
      const match = groups.find((g) => {
        if (g.type !== window.type) return false

        const gapStart = Math.abs(window.startTime.getTime() - g.endTime.getTime())
        const gapEnd = Math.abs(g.startTime.getTime() - window.endTime.getTime())
        const overlaps = window.startTime < g.endTime && window.endTime > g.startTime

        return overlaps || gapStart < 20 * 60000 || gapEnd < 20 * 60000
      })

      if (match) {
        // Merge into existing group
        match.startTime = new Date(Math.min(match.startTime.getTime(), window.startTime.getTime()))
        match.endTime = new Date(Math.max(match.endTime.getTime(), window.endTime.getTime()))
        match.targetCarbs += window.targetCarbs
        match.targetProtein += window.targetProtein
        match.targetFat += window.targetFat

        // Aggregate workouts
        if (window.workouts) {
          if (!match.workouts) match.workouts = []
          window.workouts.forEach((w) => {
            if (!match.workouts!.find((mw) => mw.id === w.id)) match.workouts!.push(w)
          })
        }

        // Aggregate workout IDs
        if (window.workoutIds) {
          if (!match.workoutIds) match.workoutIds = []
          window.workoutIds.forEach((id) => {
            if (!match.workoutIds!.includes(id)) match.workoutIds!.push(id)
          })
        }

        // Aggregate Titles (uniquely)
        if (window.workoutTitle) {
          const parts = match.workoutTitle?.split(' & ') || []
          if (!parts.includes(window.workoutTitle)) {
            parts.push(window.workoutTitle)
            match.workoutTitle = parts.join(' & ')
          }
        }
      } else {
        // Start a new group
        groups.push({ ...window })
      }
    })
    baseTimeline = groups
  }

  // 2. Inject WORKOUT_EVENT markers
  const timelineWithEvents: FuelingTimelineWindow[] = []
  const representedWorkoutIds = new Set<string>()
  const injectedEventIds = new Set<string>()

  // Collect all workouts that have associated fueling windows
  baseTimeline.forEach((w) => {
    if (w.workoutIds) {
      w.workoutIds.forEach((id) => representedWorkoutIds.add(id))
    }
  })

  baseTimeline.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  baseTimeline.forEach((window) => {
    // For INTRA/TRANSITION windows, we inject the physical event markers immediately before them
    if (
      (window.type === 'INTRA_WORKOUT' || window.type === 'TRANSITION') &&
      window.workouts?.length
    ) {
      // Sort workouts by start time within this window
      const sortedWorkouts = [...window.workouts].sort(
        (a, b) => getWorkoutDate(a, options.timezone) - getWorkoutDate(b, options.timezone)
      )

      sortedWorkouts.forEach((w) => {
        if (!injectedEventIds.has(w.id)) {
          const workoutStartTime = new Date(getWorkoutDate(w, options.timezone))
          timelineWithEvents.push({
            type: 'WORKOUT_EVENT',
            startTime: workoutStartTime,
            endTime: addMinutes(workoutStartTime, (w.durationSec || 3600) / 60),
            targetCarbs: 0,
            targetProtein: 0,
            targetFat: 0,
            description: w.title,
            workout: w,
            workouts: [w],
            items: []
          })
          injectedEventIds.add(w.id)
        }
      })
    }
    timelineWithEvents.push(window)
  })

  // 3. Inject "orphaned" workouts (ones with no fueling windows)
  trainingWorkouts.forEach((workout) => {
    if (!representedWorkoutIds.has(workout.id) && !injectedEventIds.has(workout.id)) {
      const workoutStart = new Date(getWorkoutDate(workout, options.timezone))
      const eventWindow: FuelingTimelineWindow = {
        type: 'WORKOUT_EVENT',
        startTime: workoutStart,
        endTime: addMinutes(workoutStart, (workout.durationSec || 3600) / 60),
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        description: workout.title,
        workout: workout,
        workouts: [workout],
        items: []
      }
      injectedEventIds.add(workout.id)

      // Find insertion point
      const insertIdx = timelineWithEvents.findIndex((w) => w.startTime > workoutStart)
      if (insertIdx === -1) {
        timelineWithEvents.push(eventWindow)
      } else {
        timelineWithEvents.splice(insertIdx, 0, eventWindow)
      }
    }
  })

  // 4. Add Daily Base gaps and assign scheduled meals to all windows
  const finalTimeline: FuelingTimelineWindow[] = []
  let lastTime = dayStart

  const assignMealsToWindow = (window: FuelingTimelineWindow) => {
    const windowMeals = (options.mealPattern || []).filter((m) => {
      try {
        const mTime = fromZonedTime(`${dateStr}T${m.time}:00`, options.timezone)
        return mTime >= window.startTime && mTime < window.endTime
      } catch (e) {
        return false
      }
    })
    window.meals = windowMeals.map((m) => m.name)
  }

  timelineWithEvents.forEach((window) => {
    if (window.startTime > lastTime) {
      const gapWindow: FuelingTimelineWindow = {
        type: 'DAILY_BASE',
        startTime: lastTime,
        endTime: window.startTime,
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        description: '',
        items: []
      }
      assignMealsToWindow(gapWindow)
      gapWindow.description =
        gapWindow.meals && gapWindow.meals.length > 0
          ? gapWindow.meals.join(' & ')
          : 'Daily baseline'
      finalTimeline.push(gapWindow)
    }

    // Also assign meals to the actual window (PRE/INTRA/POST/EVENT)
    assignMealsToWindow(window)
    finalTimeline.push(window)
    lastTime = window.endTime
  })

  if (lastTime < dayEnd) {
    const gapWindow: FuelingTimelineWindow = {
      type: 'DAILY_BASE',
      startTime: lastTime,
      endTime: dayEnd,
      targetCarbs: 0,
      targetProtein: 0,
      targetFat: 0,
      description: '',
      items: []
    }
    assignMealsToWindow(gapWindow)
    gapWindow.description =
      gapWindow.meals && gapWindow.meals.length > 0 ? gapWindow.meals.join(' & ') : 'Daily baseline'
    finalTimeline.push(gapWindow)
  }

  // 5. Slot logged items
  const meals = ['breakfast', 'lunch', 'dinner', 'snacks']
  const allLoggedItems: any[] = []

  meals.forEach((meal) => {
    if (Array.isArray(nutritionRecord[meal])) {
      allLoggedItems.push(
        ...nutritionRecord[meal].map((item: any) => ({ ...item, meal, isSynthetic: false }))
      )
    }
  })

  // Synthetic logs from plan (if no real logs)
  if (fuelingPlan?.windows && allLoggedItems.length === 0) {
    fuelingPlan.windows.forEach((w: any) => {
      if (w.targetCarbs > 0) {
        allLoggedItems.push({
          name: `Synthetic ${w.type}`,
          carbs: w.targetCarbs,
          logged_at: w.startTime,
          isSynthetic: true
        })
      }
    })
  } else if (allLoggedItems.length === 0 && (nutritionRecord.carbsGoal || 0) > 0) {
    const pattern =
      options.mealPattern && options.mealPattern.length > 0
        ? options.mealPattern
        : [
            { name: 'Breakfast', time: '08:00' },
            { name: 'Lunch', time: '13:00' },
            { name: 'Dinner', time: '19:00' }
          ]
    pattern.forEach((p: any) => {
      allLoggedItems.push({
        name: `Synthetic ${p.name}`,
        carbs: Math.round((nutritionRecord.carbsGoal || 300) / pattern.length),
        logged_at: fromZonedTime(`${dateStr}T${p.time}:00`, options.timezone).toISOString(),
        isSynthetic: true
      })
    })
  }

  allLoggedItems.forEach((item) => {
    let itemTime: Date | null = null
    const timeVal = item.logged_at || item.date

    if (timeVal) {
      try {
        if (typeof timeVal === 'string' && /^\d{2}:\d{2}$/.test(timeVal)) {
          itemTime = fromZonedTime(`${dateStr}T${timeVal}:00`, options.timezone)
        } else {
          const normalized = typeof timeVal === 'string' ? timeVal.replace(' ', 'T') : timeVal
          itemTime = new Date(normalized)
        }
      } catch (e) {
        // ignore error
      }
    }

    if (itemTime && !isNaN(itemTime.getTime())) {
      const window = finalTimeline.find(
        (w) => w.type !== 'WORKOUT_EVENT' && itemTime! >= w.startTime && itemTime! < w.endTime
      )
      if (window) window.items.push({ ...item, _heuristic_time: itemTime.toISOString() })
    } else {
      if (item.meal === 'breakfast') {
        const first = finalTimeline.find((w) => w.type === 'DAILY_BASE')
        if (first) first.items.push(item)
      } else if (item.meal === 'dinner') {
        const last = [...finalTimeline].reverse().find((w) => w.type === 'DAILY_BASE')
        if (last) last.items.push(item)
      } else {
        const middle = finalTimeline.find(
          (w) => w.type === 'DAILY_BASE' && w.startTime.getHours() > 10
        )
        if (middle) middle.items.push(item)
        else if (finalTimeline[0]) finalTimeline[0].items.push(item)
      }
    }
  })

  return finalTimeline
}
