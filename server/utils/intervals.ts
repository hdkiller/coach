import type { Integration } from '@prisma/client'

interface IntervalsActivity {
  id: string
  start_date_local: string
  name: string
  description?: string
  type: string
  moving_time: number
  elapsed_time?: number
  duration?: number
  distance?: number
  total_elevation_gain?: number
  
  // Power metrics
  average_watts?: number
  max_watts?: number
  normalized_power?: number
  icu_average_watts?: number
  icu_weighted_avg_watts?: number
  icu_ftp?: number
  icu_joules?: number
  icu_variability_index?: number
  icu_power_hr?: number
  icu_efficiency_factor?: number
  
  // Heart rate
  average_heartrate?: number
  max_heartrate?: number
  
  // Cadence
  average_cadence?: number
  max_cadence?: number
  
  // Speed
  average_speed?: number
  
  // Training load
  icu_training_load?: number
  icu_intensity?: number
  trimp?: number
  tss?: number
  intensity?: number
  
  // Training status
  icu_ctl?: number
  icu_atl?: number
  
  // Subjective
  perceived_exertion?: number
  session_rpe?: number
  feel?: number
  
  // Performance
  decoupling?: number
  polarization_index?: number
  
  // Environmental
  average_temp?: number
  trainer?: boolean
  
  // Balance
  avg_lr_balance?: number
  
  [key: string]: any
}

interface IntervalsWellness {
  id: string
  restingHR?: number
  hrv?: number
  hrvSDNN?: number
  sleepSecs?: number
  sleepScore?: number
  sleepQuality?: number
  avgSleepingHR?: number
  readiness?: number
  soreness?: number
  fatigue?: number
  stress?: number
  mood?: number
  motivation?: number
  weight?: number
  spO2?: number
  ctl?: number
  atl?: number
  comments?: string
  [key: string]: any
}

interface IntervalsAthlete {
  id: string
  email: string
  name: string
}

interface IntervalsPlannedWorkout {
  id: string
  start_date_local: string
  name: string
  description?: string
  type?: string
  category?: string
  duration?: number
  distance?: number
  tss?: number
  work?: number
  workout_doc?: any
  [key: string]: any
}

export async function fetchIntervalsPlannedWorkouts(
  integration: Integration,
  startDate: Date,
  endDate: Date
): Promise<IntervalsPlannedWorkout[]> {
  const athleteId = integration.externalUserId || 'i0'
  
  const url = new URL(`https://intervals.icu/api/v1/athlete/${athleteId}/events`)
  url.searchParams.set('oldest', startDate.toISOString().split('T')[0])
  url.searchParams.set('newest', endDate.toISOString().split('T')[0])
  
  const auth = Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')
    
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Intervals API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export async function fetchIntervalsWorkouts(
  integration: Integration,
  startDate: Date,
  endDate: Date
): Promise<IntervalsActivity[]> {
  const athleteId = integration.externalUserId || 'i0' // i0 means "current authenticated user"
  
  const url = new URL(`https://intervals.icu/api/v1/athlete/${athleteId}/activities`)
  url.searchParams.set('oldest', startDate.toISOString().split('T')[0])
  url.searchParams.set('newest', endDate.toISOString().split('T')[0])
  
  // Intervals.icu API expects Basic Auth with "API_KEY" as username and the API key as password
  const auth = Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')
    
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Intervals API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export async function fetchIntervalsAthlete(accessToken: string, athleteId?: string): Promise<IntervalsAthlete> {
  // Intervals.icu API expects Basic Auth with "API_KEY" as username and the API key as password
  // The athlete ID must be provided in the URL path
  
  if (!athleteId) {
    throw new Error('Athlete ID is required')
  }
  
  const auth = Buffer.from(`API_KEY:${accessToken}`).toString('base64')
  
  const response = await fetch(`https://intervals.icu/api/v1/athlete/${athleteId}`, {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Intervals.icu API error:', response.status, errorText)
    throw new Error(`Intervals API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export async function fetchIntervalsWellness(
  integration: Integration,
  startDate: Date,
  endDate: Date
): Promise<IntervalsWellness[]> {
  const athleteId = integration.externalUserId || 'i0'
  
  const wellness: IntervalsWellness[] = []
  
  // Fetch wellness data for each day in the range
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const url = `https://intervals.icu/api/v1/athlete/${athleteId}/wellness/${dateStr}`
    
    const auth = Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        wellness.push({ id: dateStr, ...data })
      }
    } catch (error) {
      // Continue on error for individual days
      console.error(`Error fetching wellness for ${dateStr}:`, error)
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return wellness
}

export function normalizeIntervalsWorkout(activity: IntervalsActivity, userId: string) {
  const moving_time = activity.moving_time || 0
  const elapsed_time = activity.elapsed_time || 0
  const duration = activity.duration || 0
  const durationSec = moving_time || elapsed_time || duration
  
  return {
    userId,
    externalId: activity.id,
    source: 'intervals',
    date: new Date(activity.start_date_local),
    title: activity.name || 'Unnamed Activity',
    description: activity.description || null,
    type: activity.type,
    durationSec,
    distanceMeters: activity.distance || null,
    elevationGain: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
    
    // Power metrics
    averageWatts: activity.icu_average_watts || activity.average_watts || null,
    maxWatts: activity.max_watts || null,
    normalizedPower: activity.normalized_power || null,
    weightedAvgWatts: activity.icu_weighted_avg_watts || null,
    
    // Heart rate
    averageHr: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    maxHr: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    
    // Cadence
    averageCadence: activity.average_cadence ? Math.round(activity.average_cadence) : null,
    maxCadence: activity.max_cadence ? Math.round(activity.max_cadence) : null,
    
    // Speed
    averageSpeed: activity.average_speed || null,
    
    // Training load
    tss: activity.tss || null,
    trainingLoad: activity.icu_training_load || null,
    intensity: activity.icu_intensity || activity.intensity || null,
    kilojoules: activity.icu_joules || null,
    trimp: activity.trimp || null,
    
    // Performance metrics
    ftp: activity.icu_ftp || null,
    variabilityIndex: activity.icu_variability_index || null,
    powerHrRatio: activity.icu_power_hr || null,
    efficiencyFactor: activity.icu_efficiency_factor || null,
    decoupling: activity.decoupling || null,
    polarizationIndex: activity.polarization_index || null,
    
    // Training status
    ctl: activity.icu_ctl || null,
    atl: activity.icu_atl || null,
    
    // Subjective metrics
    rpe: activity.perceived_exertion || null,
    sessionRpe: activity.session_rpe || null,
    feel: activity.feel || null,
    
    // Environmental
    avgTemp: activity.average_temp || null,
    trainer: activity.trainer || null,
    
    // Balance
    lrBalance: activity.avg_lr_balance || null,
    
    // Store raw data
    rawJson: activity
  }
}

export function normalizeIntervalsPlannedWorkout(event: IntervalsPlannedWorkout, userId: string) {
  return {
    userId,
    externalId: String(event.id), // Convert to string
    date: new Date(event.start_date_local),
    title: event.name || 'Unnamed Event',
    description: event.description || null,
    type: event.type || null,
    category: event.category || 'WORKOUT',
    durationSec: event.duration || null,
    distanceMeters: event.distance || null,
    tss: event.tss || null,
    workIntensity: event.work || null,
    completed: false,
    workoutId: null,
    rawJson: event
  }
}

export function normalizeIntervalsWellness(wellness: IntervalsWellness, userId: string, date: Date) {
  return {
    userId,
    date,
    
    // HRV
    hrv: wellness.hrv || null,
    hrvSdnn: wellness.hrvSDNN || null,
    
    // Heart rate
    restingHr: wellness.restingHR || null,
    avgSleepingHr: wellness.avgSleepingHR || null,
    
    // Sleep
    sleepSecs: wellness.sleepSecs || null,
    sleepHours: wellness.sleepSecs ? Math.round((wellness.sleepSecs / 3600) * 10) / 10 : null,
    sleepScore: wellness.sleepScore || null,
    sleepQuality: wellness.sleepQuality || null,
    
    // Recovery
    readiness: wellness.readiness || null,
    recoveryScore: null, // Not directly available from Intervals.icu
    
    // Subjective
    soreness: wellness.soreness || null,
    fatigue: wellness.fatigue || null,
    stress: wellness.stress || null,
    mood: wellness.mood || null,
    motivation: wellness.motivation || null,
    
    // Physical
    weight: wellness.weight || null,
    spO2: wellness.spO2 || null,
    
    // Training load
    ctl: wellness.ctl || null,
    atl: wellness.atl || null,
    
    // Notes
    comments: wellness.comments || null,
    
    // Raw data
    rawJson: wellness
  }
}