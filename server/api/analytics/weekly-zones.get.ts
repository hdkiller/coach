import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../utils/db'
import { userRepository } from '../../utils/repositories/userRepository'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import { calculatePowerZones, calculateHrZones } from '../../utils/zones'
import { getServerSession } from '../../utils/session'
import { getUserTimezone, getStartOfYearUTC, getUserLocalDate } from '../../utils/date'

defineRouteMeta({
  openAPI: {
    tags: ['Analytics'],
    summary: 'Get weekly zone distribution',
    description: 'Returns time spent in power and heart rate zones aggregated weekly.',
    parameters: [
      {
        name: 'weeks',
        in: 'query',
        schema: { type: ['integer', 'string'], default: 12 }
      },
      {
        name: 'sport',
        in: 'query',
        schema: { type: 'string' }
      }
    ]
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = (session.user as any).id
  const timezone = await getUserTimezone(userId)

  const query = getQuery(event)
  const sport = query.sport === 'all' ? undefined : (query.sport as string)
  const endDate = getUserLocalDate(timezone)
  let startDate = getUserLocalDate(timezone)
  let numWeeks = 0

  if (query.weeks === 'YTD') {
    startDate = getStartOfYearUTC(timezone)
    // Calculate weeks since start of year
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    numWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  } else {
    numWeeks = parseInt(query.weeks as string) || 12
    startDate.setUTCDate(startDate.getUTCDate() - numWeeks * 7)
  }

  // 1. Get user and sport settings
  const user = await userRepository.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const allSportSettings = await sportSettingsRepository.getByUserId(userId)
  const defaultSettings = await sportSettingsRepository.getDefault(userId)

  // 2. Get workouts with streams
  const workouts = await workoutRepository.getForUser(userId, {
    startDate,
    endDate,
    where: sport ? { type: sport } : undefined,
    select: {
      date: true,
      ftp: true,
      type: true, // Needed for sport matching
      streams: {
        select: {
          time: true,
          watts: true,
          heartrate: true
        }
      }
    }
  })

  // 3. Initialize buckets
  const weeklyData = new Map<
    string,
    {
      weekStart: string
      powerZones: number[]
      hrZones: number[]
      totalDuration: number
    }
  >()

  // Pre-fill weeks to ensure gaps are shown
  for (let i = 0; i <= numWeeks; i++) {
    const d = new Date(startDate)
    d.setUTCDate(d.getUTCDate() + i * 7)

    const start = getWeekStart(d)
    const key = start.toISOString().split('T')[0]
    if (key) {
      weeklyData.set(key, {
        weekStart: key,
        powerZones: new Array(7).fill(0),
        hrZones: new Array(7).fill(0),
        totalDuration: 0
      })
    }
  }

  // 4. Aggregate
  for (const workoutRaw of workouts) {
    const workout = workoutRaw as any
    if (!workout.streams) continue

    const weekStart = getWeekStart(workout.date)
    const key = weekStart.toISOString().split('T')[0]
    if (!key) continue

    const bucket = weeklyData.get(key)
    if (!bucket) continue

    // Determine Sport Settings for this workout
    let activitySettings = defaultSettings
    if (workout.type) {
      // Try to find specific match
      const match = allSportSettings.find(
        (s: any) => !s.isDefault && s.types && s.types.includes(workout.type)
      )
      if (match) activitySettings = match
    }

    // Get zones for this workout
    const ftp = workout.ftp || activitySettings?.ftp || user.ftp || 200
    // Use settings LTHR if available, otherwise User LTHR (historically fetched via repo, or just current?)
    // Historic LTHR is better but heavy. Let's use current setting profile LTHR as proxy or fallback.
    const lthr = activitySettings?.lthr || user.lthr || 160
    const maxHr = activitySettings?.maxHr || user.maxHr || 190

    // Use custom zones from profile if available, otherwise calculate
    // Note: sportSettings might have empty powerZones array if not configured
    let pZones = activitySettings?.powerZones as any[]
    if (!pZones || pZones.length === 0) {
      pZones = calculatePowerZones(ftp)
    }

    let hZones = activitySettings?.hrZones as any[]
    if (!hZones || hZones.length === 0) {
      hZones = calculateHrZones(lthr, maxHr)
    }

    const streams = workout.streams
    const time = (streams.time as number[]) || []
    const watts = (streams.watts as number[]) || []
    const hr = (streams.heartrate as number[]) || []

    for (let i = 0; i < time.length; i++) {
      const currentTime = time[i]
      if (currentTime === undefined || currentTime === null) continue

      const prevTime = i === 0 ? currentTime : time[i - 1]
      const delta = i === 0 ? 0 : currentTime - (prevTime || 0)
      if (delta <= 0 || delta > 10) continue // Skip pauses

      bucket.totalDuration += delta

      const w = watts[i]
      if (w !== undefined && w !== null) {
        const zIndex = pZones.findIndex((z: any) => w >= z.min && w <= z.max)
        if (zIndex !== -1 && bucket.powerZones[zIndex] !== undefined) {
          bucket.powerZones[zIndex] += delta
        }
      }

      const h = hr[i]
      if (h !== undefined && h !== null) {
        const zIndex = hZones.findIndex((z: any) => h >= z.min && h <= z.max)
        if (zIndex !== -1 && bucket.hrZones[zIndex] !== undefined) {
          bucket.hrZones[zIndex] += delta
        }
      }
    }
  }

  // 5. Finalize results
  const result = Array.from(weeklyData.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((w) => ({
      ...w,
      powerZones: w.powerZones.map((s) => Math.round((s / 3600) * 10) / 10),
      hrZones: w.hrZones.map((s) => Math.round((s / 3600) * 10) / 10),
      totalDuration: Math.round((w.totalDuration / 3600) * 10) / 10
    }))

  // Generate labels based on Default Profile
  const defFtp = defaultSettings?.ftp || user.ftp || 200
  const defLthr = defaultSettings?.lthr || user.lthr || 160
  const defMaxHr = defaultSettings?.maxHr || user.maxHr || 190

  let labelPZones = (defaultSettings?.powerZones as any[]) || []
  if (labelPZones.length === 0) labelPZones = calculatePowerZones(defFtp)

  let labelHZones = (defaultSettings?.hrZones as any[]) || []
  if (labelHZones.length === 0) labelHZones = calculateHrZones(defLthr, defMaxHr)

  return {
    weeks: result,
    zoneLabels: {
      power: labelPZones.map((z: any) => z.name),
      hr: labelHZones.map((z: any) => z.name)
    }
  }
})

function getWeekStart(d: Date) {
  const date = new Date(d)
  const day = date.getUTCDay()
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  date.setUTCDate(diff)
  // setHours(0,0,0,0) is redundant for getUserLocalDate() dates but harmless if already UTC midnight
  date.setUTCHours(0, 0, 0, 0)
  return date
}
