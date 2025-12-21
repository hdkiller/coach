import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getServerSession } from '#auth'
import { prisma } from '../../../utils/db'
import {
  detectIntervals,
  findPeakEfforts,
  calculateHeartRateRecovery,
  calculateAerobicDecoupling,
  calculateCoastingStats,
  detectSurgesAndFades
} from '../../../utils/interval-detection'
import {
  calculateWPrimeBalance,
  calculateEfficiencyFactorDecay,
  calculateQuadrantAnalysis
} from '../../../utils/performance-metrics'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const workoutId = getRouterParam(event, 'id')
  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Get workout with streams
  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      userId: user.id
    },
    include: {
      streams: true
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found'
    })
  }

  // Check if workout has stream data
  if (!workout.streams) {
    // Return standard object even if no data
    return {
      hasData: false,
      message: 'No timeline data available for this workout',
      intervals: [],
      peaks: { power: [], heartrate: [], pace: [] },
      recovery: null,
      detectionMetric: null
    }
  }

  const streams = workout.streams
  const time = streams.time as number[]

  if (!time || time.length === 0) {
    return {
      hasData: false,
      message: 'No time stream available',
      intervals: [],
      peaks: { power: [], heartrate: [], pace: [] },
      recovery: null,
      detectionMetric: null
    }
  }

  // 1. Detect Intervals
  // Priority: Power > Pace (Velocity) > HR
  let detectedIntervals: any[] = []
  let detectionMetric = ''

  if (streams.watts && (streams.watts as number[]).length > 0) {
    // Detect based on Power
    detectionMetric = 'power'
    // Use FTP as threshold if available, otherwise auto-baseline
    const ftp = workout.ftp || user.ftp
    detectedIntervals = detectIntervals(time, streams.watts as number[], 'power', ftp || undefined)
  } else if (streams.velocity && (streams.velocity as number[]).length > 0) {
    // Detect based on Pace (Velocity)
    // Only for runs/swims typically
    if (workout.type === 'Run' || workout.type === 'Swim' || workout.type === 'Walk') {
      detectionMetric = 'pace'
      detectedIntervals = detectIntervals(time, streams.velocity as number[], 'pace')
    }
  } else if (streams.heartrate && (streams.heartrate as number[]).length > 0) {
    // Detect based on HR (least reliable for short intervals due to lag, but good for steady state)
    detectionMetric = 'heartrate'
    const maxHr = workout.maxHr || user.maxHr
    const threshold = maxHr ? maxHr * 0.7 : undefined // approx Z2 border
    detectedIntervals = detectIntervals(time, streams.heartrate as number[], 'heartrate', threshold)
  }

  // 2. Find Peak Efforts
  const peakPower = streams.watts ? findPeakEfforts(time, streams.watts as number[], 'power') : []
  const peakHr = streams.heartrate ? findPeakEfforts(time, streams.heartrate as number[], 'heartrate') : []
  const peakPace = streams.velocity ? findPeakEfforts(time, streams.velocity as number[], 'pace') : []

  // 3. Heart Rate Recovery
  const hrRecovery = streams.heartrate ? calculateHeartRateRecovery(time, streams.heartrate as number[]) : null

  // 4. Advanced Metrics (Drift, Coasting, Surges)
  const decoupling = (streams.watts && streams.heartrate)
    ? calculateAerobicDecoupling(time, streams.watts as number[], streams.heartrate as number[])
    : null

  const coasting = streams.watts
    ? calculateCoastingStats(time, streams.watts as number[], (streams.cadence as number[]) || [], streams.velocity as number[])
    : null

  const ftp = workout.ftp || user.ftp
  const surges = (streams.watts && ftp)
    ? detectSurgesAndFades(time, streams.watts as number[], ftp)
    : []

  // 5. New Advanced Analytics (W' Bal, EF Decay, Quadrants)
  const wPrime = (streams.watts && ftp)
    ? calculateWPrimeBalance(streams.watts as number[], time, ftp, 20000) // Default 20kJ if unknown
    : null

  const efDecay = (streams.watts && streams.heartrate)
    ? calculateEfficiencyFactorDecay(streams.watts as number[], streams.heartrate as number[], time)
    : null

  const quadrants = (streams.watts && streams.cadence && ftp)
    ? calculateQuadrantAnalysis(streams.watts as number[], streams.cadence as number[], ftp)
    : null

  // Enrich intervals with stats from other streams
  const enrichedIntervals = detectedIntervals.map(interval => {
    const startIdx = interval.start_index
    const endIdx = interval.end_index
    
    const stats: any = { ...interval }
    
    // Add avg Power if available and not already set
    if (streams.watts && detectionMetric !== 'power') {
      const vals = (streams.watts as number[]).slice(startIdx, endIdx + 1)
      stats.avg_power = vals.reduce((a, b) => a + b, 0) / vals.length
      stats.max_power = Math.max(...vals)
    }
    
    // Add avg HR if available
    if (streams.heartrate) {
      const vals = (streams.heartrate as number[]).slice(startIdx, endIdx + 1)
      stats.avg_heartrate = vals.reduce((a, b) => a + b, 0) / vals.length
      stats.max_heartrate = Math.max(...vals)
    }
    
    // Add avg Pace if available
    if (streams.velocity) {
      const vals = (streams.velocity as number[]).slice(startIdx, endIdx + 1)
      stats.avg_pace = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    
    // Add avg Cadence if available
    if (streams.cadence) {
      const vals = (streams.cadence as number[]).slice(startIdx, endIdx + 1)
      stats.avg_cadence = vals.reduce((a, b) => a + b, 0) / vals.length
    }

    return stats
  })
  
  // Sample data for chart (return ~500 points for performance)
  const sampleRate = Math.max(1, Math.floor(time.length / 500))
  const sample = (data: number[]) => data ? data.filter((_, i) => i % sampleRate === 0) : []
  
  const chartData = {
    time: sample(time),
    power: streams.watts ? sample(streams.watts as number[]) : [],
    heartrate: streams.heartrate ? sample(streams.heartrate as number[]) : [],
    pace: streams.velocity ? sample(streams.velocity as number[]) : [],
    wPrime: wPrime ? sample(wPrime.wPrimeBalance) : [],
    ef: efDecay ? sample(efDecay.efStream) : []
  }

  return {
    hasData: true,
    detectionMetric,
    intervals: enrichedIntervals,
    peaks: {
      power: peakPower,
      heartrate: peakHr,
      pace: peakPace
    },
    recovery: hrRecovery,
    advanced: {
      decoupling,
      coasting,
      surges,
      wPrime,
      efDecay,
      quadrants
    },
    chartData
  }
})
