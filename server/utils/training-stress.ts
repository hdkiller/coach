/**
 * Training Stress Metrics Calculation Service
 * 
 * Implements the Performance Management Chart (PMC) methodology for tracking:
 * - CTL (Chronic Training Load) - 42-day weighted average representing "Fitness"
 * - ATL (Acute Training Load) - 7-day weighted average representing "Fatigue"
 * - TSB (Training Stress Balance) - CTL - ATL representing "Form"
 */

export interface PMCMetrics {
  date: Date
  ctl: number
  atl: number
  tsb: number
  tss: number
}

export interface FormStatus {
  status: string
  color: string
  description: string
}

/**
 * Calculate CTL (Chronic Training Load) - "Fitness"
 * Uses 42-day exponentially weighted moving average
 */
export function calculateCTL(previousCTL: number, todayTSS: number): number {
  const timeConstant = 42
  return previousCTL + (todayTSS - previousCTL) / timeConstant
}

/**
 * Calculate ATL (Acute Training Load) - "Fatigue"
 * Uses 7-day exponentially weighted moving average
 */
export function calculateATL(previousATL: number, todayTSS: number): number {
  const timeConstant = 7
  return previousATL + (todayTSS - previousATL) / timeConstant
}

/**
 * Calculate TSB (Training Stress Balance) - "Form"
 * TSB = CTL - ATL
 */
export function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl
}

/**
 * Get training stress score from workout
 * Prioritizes: power-based TSS > HRSS > TRIMP
 */
export function getStressScore(workout: any): number {
  return workout.tss ?? workout.hrss ?? workout.trimp ?? 0
}

/**
 * Get form status based on TSB value
 */
export function getFormStatus(tsb: number): FormStatus {
  if (tsb > 25) {
    return {
      status: 'No Fitness',
      color: 'gray',
      description: 'Resting too long; fitness declining'
    }
  }
  if (tsb > 5) {
    return {
      status: 'Performance',
      color: 'green',
      description: 'Fresh and ready to race; peak form'
    }
  }
  if (tsb > -10) {
    return {
      status: 'Maintenance',
      color: 'yellow',
      description: 'Neutral zone; maintaining fitness'
    }
  }
  if (tsb > -25) {
    return {
      status: 'Productive',
      color: 'blue',
      description: 'Optimal training zone; building fitness'
    }
  }
  if (tsb > -40) {
    return {
      status: 'Cautionary',
      color: 'orange',
      description: 'High fatigue; injury risk increasing'
    }
  }
  return {
    status: 'Overreaching',
    color: 'red',
    description: 'Severe fatigue; rest needed immediately'
  }
}

/**
 * Get TSB color class for UI
 */
export function getTSBColorClass(tsb: number | null): string {
  if (tsb === null) return 'text-gray-400'
  if (tsb >= 5) return 'text-green-600 dark:text-green-400'
  if (tsb >= -10) return 'text-yellow-600 dark:text-yellow-400'
  if (tsb >= -25) return 'text-blue-600 dark:text-blue-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Calculate PMC metrics for a date range
 * Returns array of daily metrics with CTL/ATL/TSB
 */
export async function calculatePMCForDateRange(
  startDate: Date,
  endDate: Date,
  userId: string,
  initialCTL: number = 0,
  initialATL: number = 0
): Promise<PMCMetrics[]> {
  const { prisma } = await import('./db')
  
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      isDuplicate: false
    },
    orderBy: { date: 'asc' }
  })

  let ctl = initialCTL
  let atl = initialATL
  const results: PMCMetrics[] = []

  for (const workout of workouts) {
    const tss = getStressScore(workout)
    ctl = calculateCTL(ctl, tss)
    atl = calculateATL(atl, tss)
    const tsb = calculateTSB(ctl, atl)

    results.push({
      date: workout.date,
      ctl,
      atl,
      tsb,
      tss
    })
  }

  return results
}

/**
 * Get initial CTL/ATL values from last known workout before date range
 */
export async function getInitialPMCValues(
  userId: string,
  beforeDate: Date
): Promise<{ ctl: number; atl: number }> {
  const { prisma } = await import('./db')
  
  const lastWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      date: { lt: beforeDate },
      isDuplicate: false,
      OR: [
        { ctl: { not: null } },
        { atl: { not: null } }
      ]
    },
    orderBy: { date: 'desc' }
  })

  return {
    ctl: lastWorkout?.ctl ?? 0,
    atl: lastWorkout?.atl ?? 0
  }
}

/**
 * Calculate and update CTL/ATL for all workouts for a user
 * Used for backfilling historical data
 */
export async function backfillPMCMetrics(userId: string): Promise<number> {
  const { prisma } = await import('./db')
  
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      isDuplicate: false
    },
    orderBy: { date: 'asc' }
  })

  let ctl = 0
  let atl = 0
  let updated = 0

  for (const workout of workouts) {
    const tss = getStressScore(workout)
    ctl = calculateCTL(ctl, tss)
    atl = calculateATL(atl, tss)

    await prisma.workout.update({
      where: { id: workout.id },
      data: { ctl, atl }
    })
    
    updated++
  }

  return updated
}

/**
 * Get current fitness summary
 */
export async function getCurrentFitnessSummary(userId: string) {
  const { prisma } = await import('./db')
  
  const latestWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      isDuplicate: false,
      ctl: { not: null },
      atl: { not: null }
    },
    orderBy: { date: 'desc' }
  })

  if (!latestWorkout || !latestWorkout.ctl || !latestWorkout.atl) {
    return {
      ctl: 0,
      atl: 0,
      tsb: 0,
      formStatus: getFormStatus(0),
      lastUpdated: null
    }
  }

  const tsb = calculateTSB(latestWorkout.ctl, latestWorkout.atl)

  return {
    ctl: latestWorkout.ctl,
    atl: latestWorkout.atl,
    tsb,
    formStatus: getFormStatus(tsb),
    lastUpdated: latestWorkout.date
  }
}