import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import {
  getUserLocalDate,
  getUserTimezone,
  getStartOfDayUTC,
  getEndOfDayUTC,
  buildZonedDateTimeFromUtcDate
} from '../../utils/date'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { wellnessRepository } from '../../utils/repositories/wellnessRepository'
import { calendarNoteRepository } from '../../utils/repositories/calendarNoteRepository'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { calculateFuelingStrategy } from '../../utils/nutrition-domain'
import { getUserNutritionSettings } from '../../utils/nutrition/settings'
import { metabolicService } from '../../utils/services/metabolicService'
import { bodyMetricResolver } from '../../utils/services/bodyMetricResolver'
import { getCalendarNoteDisplayEndDate } from '../../utils/calendar-notes'

defineRouteMeta({
  openAPI: {
    tags: ['Calendar'],
    summary: 'Get calendar activities',
    description:
      'Returns a combined list of completed and planned workouts, along with nutrition and wellness data.',
    parameters: [
      {
        name: 'startDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date-time' }
      },
      {
        name: 'endDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date-time' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  type: { type: 'string' },
                  source: { type: 'string' },
                  status: { type: 'string' },
                  duration: { type: 'integer' },
                  tss: { type: 'number', nullable: true },
                  nutrition: { type: 'object', nullable: true },
                  wellness: { type: 'object', nullable: true }
                }
              }
            }
          }
        }
      },
      400: { description: 'Invalid date parameters' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date()
  const endDate = query.endDate ? new Date(query.endDate as string) : new Date()

  // Ensure valid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date parameters'
    })
  }

  const userId = (session.user as any).id
  const startTime = Date.now()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      weight: true,
      weightSourceMode: true,
      ftp: true,
      nutritionTrackingEnabled: true
    }
  })
  const timezone = user?.timezone ?? 'UTC'
  const nutritionEnabled = user?.nutritionTrackingEnabled ?? true
  const today = getUserLocalDate(timezone)

  // Adjust dates to cover the full local days in UTC
  // rangeStart/rangeEnd are used for timestamped columns (Workout)
  const rangeStart = getStartOfDayUTC(timezone, startDate)
  const rangeEnd = getEndOfDayUTC(timezone, endDate)

  // calendarStart/calendarEnd are used for date-only columns (Nutrition, Wellness, PlannedWorkout)
  // These are stored as UTC Midnight in the database.
  const calendarStart = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  )
  const calendarEnd = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  )

  // Fetch nutrition data for the date range (when feature is enabled)
  const nutritionByDate = new Map()
  if (nutritionEnabled) {
    const nutrition = await nutritionRepository.getForUser(userId, {
      startDate: calendarStart,
      endDate: calendarEnd,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        caloriesGoal: true,
        proteinGoal: true,
        carbsGoal: true,
        fatGoal: true,
        fuelingPlan: true,
        overallScore: true,
        isManualLock: true,
        endingGlycogenPercentage: true,
        endingFluidDeficit: true,
        breakfast: true,
        lunch: true,
        dinner: true,
        snacks: true
      }
    })

    const metabolicStates = await metabolicService.getMetabolicStatesForRange(
      userId,
      calendarStart,
      calendarEnd
    )

    for (const n of nutrition) {
      if (!n) continue
      const dateKey = n.date.toISOString().split('T')[0] as string
      const state = metabolicStates.get(dateKey) || { startingGlycogen: 85, startingFluid: 0 }

      nutritionByDate.set(dateKey, {
        ...n,
        startingGlycogen: state.startingGlycogen,
        startingFluid: state.startingFluid
      })
    }
  }

  // Fetch wellness data for the date range
  const wellnessStartTime = Date.now()
  const wellness = await wellnessRepository.getForUser(userId, {
    startDate: calendarStart,
    endDate: calendarEnd,
    orderBy: { date: 'asc' }
  })

  // Fetch daily metrics data for the date range
  const dailyMetrics = await prisma.dailyMetric.findMany({
    where: {
      userId,
      date: {
        gte: calendarStart,
        lte: calendarEnd
      }
    },
    orderBy: { date: 'asc' }
  })

  // Create a map of wellness data by date (YYYY-MM-DD)
  // Prefer Wellness data, fallback to DailyMetric
  const wellnessByDate = new Map()
  for (const d of dailyMetrics) {
    const dateKey = d.date.toISOString().split('T')[0]
    wellnessByDate.set(dateKey, {
      hrv: d.hrv,
      restingHr: d.restingHr,
      sleepScore: d.sleepScore,
      hoursSlept: d.hoursSlept,
      recoveryScore: d.recoveryScore,
      weight: null
    })
  }
  for (const w of wellness) {
    const dateKey = w.date.toISOString().split('T')[0]
    const existing = wellnessByDate.get(dateKey) || {}
    wellnessByDate.set(dateKey, {
      hrv: w.hrv ?? existing.hrv,
      restingHr: w.restingHr ?? existing.restingHr,
      sleepScore: w.sleepQuality ?? w.sleepScore ?? existing.sleepScore,
      hoursSlept: w.sleepHours ?? existing.hoursSlept,
      recoveryScore: w.recoveryScore ?? existing.recoveryScore,
      weight: w.weight ?? existing.weight
    })
  }

  // Fetch completed workouts (timestamped)
  const workoutStartTime = Date.now()
  const workouts = await workoutRepository.getForUser(userId, {
    startDate: rangeStart,
    endDate: rangeEnd,
    orderBy: { date: 'asc' },
    include: {
      plannedWorkout: true,
      streams: {
        select: { id: true }
      }
    }
  })

  // Fetch planned workouts (date-only)
  const plannedStartTime = Date.now()
  const plannedWorkouts = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: {
        gte: calendarStart,
        lte: calendarEnd
      }
    },
    orderBy: { date: 'asc' }
  })

  // PROACTIVE NUTRITION ESTIMATION (only when nutrition is enabled)
  if (nutritionEnabled) {
    const nutritionSettings = await getUserNutritionSettings(userId)
    const effectiveWeight = await bodyMetricResolver.resolveEffectiveWeight(userId, {
      weight: user?.weight,
      weightSourceMode: user?.weightSourceMode
    })
    const profile = {
      weight: effectiveWeight.value || 75,
      ftp: user?.ftp || 250,
      currentCarbMax: nutritionSettings.currentCarbMax,
      sodiumTarget: nutritionSettings.sodiumTarget,
      sweatRate: nutritionSettings.sweatRate ?? undefined,
      preWorkoutWindow: nutritionSettings.preWorkoutWindow,
      postWorkoutWindow: nutritionSettings.postWorkoutWindow,
      fuelingSensitivity: nutritionSettings.fuelingSensitivity,
      fuelState1Trigger: nutritionSettings.fuelState1Trigger,
      fuelState1Min: nutritionSettings.fuelState1Min,
      fuelState1Max: nutritionSettings.fuelState1Max,
      fuelState2Trigger: nutritionSettings.fuelState2Trigger,
      fuelState2Min: nutritionSettings.fuelState2Min,
      fuelState2Max: nutritionSettings.fuelState2Max,
      fuelState3Min: nutritionSettings.fuelState3Min,
      fuelState3Max: nutritionSettings.fuelState3Max,
      bmr: nutritionSettings.bmr ?? 1600,
      activityLevel: nutritionSettings.activityLevel || 'ACTIVE',
      baseCaloriesMode: (nutritionSettings.baseCaloriesMode === 'MANUAL_NON_EXERCISE'
        ? 'MANUAL_NON_EXERCISE'
        : 'AUTO') as 'AUTO' | 'MANUAL_NON_EXERCISE',
      nonExerciseBaseCalories: nutritionSettings.nonExerciseBaseCalories ?? undefined,
      targetAdjustmentPercent: nutritionSettings.targetAdjustmentPercent ?? 0,
      baseProteinPerKg: nutritionSettings.baseProteinPerKg,
      baseFatPerKg: nutritionSettings.baseFatPerKg
    }

    // Group planned workouts by date to see which days need estimates
    const plannedByDate = new Map<string, any[]>()
    for (const p of plannedWorkouts) {
      const dateKey = p.date.toISOString().split('T')[0]
      if (dateKey) {
        if (!plannedByDate.has(dateKey)) {
          plannedByDate.set(dateKey, [])
        }
        plannedByDate.get(dateKey)!.push(p)
      }
    }

    for (const [dateKey, dayWorkouts] of plannedByDate.entries()) {
      const existing = nutritionByDate.get(dateKey)

      // Override if:
      // 1. No record exists
      // 2. Record exists but has no fueling plan AND is not manually locked
      if (!existing || (!existing.fuelingPlan && !existing.isManualLock)) {
        // Estimate fueling strategy for this day based on ALL workouts
        // We use the centralized metabolic service to ensure consistency with the dashboard
        if (dayWorkouts.length > 0) {
          const date = new Date(`${dateKey}T00:00:00Z`)
          const planResult = await metabolicService.calculateFuelingPlanForDate(userId, date, {
            persist: false
          })
          const estimate = planResult.plan as any

          nutritionByDate.set(dateKey, {
            calories: existing?.calories ?? 0,
            protein: existing?.protein ?? 0,
            carbs: existing?.carbs ?? 0,
            fat: existing?.fat ?? 0,
            caloriesGoal: estimate.dailyTotals.calories,
            proteinGoal: estimate.dailyTotals.protein,
            carbsGoal: estimate.dailyTotals.carbs,
            fatGoal: estimate.dailyTotals.fat,
            fuelingPlan: estimate,
            isEstimate: !existing, // Full estimate if no record existed
            isEstimateGoal: !!existing, // Estimated goal for an existing record
            overallScore: existing?.overallScore
          })
        }
      }
    }
  }

  // Fetch calendar notes (timestamped)
  const notesStartTime = Date.now()
  const calendarNotes = await calendarNoteRepository.getForUser(userId, {
    startDate: rangeStart,
    endDate: rangeEnd,
    orderBy: { startDate: 'asc' }
  })

  // Fetch goals (targetDate or eventDate)
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      OR: [
        {
          targetDate: {
            gte: calendarStart,
            lte: calendarEnd
          }
        },
        {
          eventDate: {
            gte: calendarStart,
            lte: calendarEnd
          }
        }
      ]
    },
    orderBy: { targetDate: 'asc' }
  })

  // Fetch metric history (threshold changes)
  const metricHistory = await prisma.metricHistory.findMany({
    where: {
      userId,
      date: {
        gte: rangeStart,
        lte: rangeEnd
      },
      // Only show true threshold changes on the calendar, not session-level peaks
      type: {
        in: ['FTP', 'LTHR', 'MAX_HR', 'THRESHOLD_PACE', 'WEIGHT']
      }
    },
    orderBy: { date: 'asc' }
  })

  // Fetch personal bests
  const personalBests = await prisma.personalBest.findMany({
    where: {
      userId,
      date: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    orderBy: { date: 'asc' }
  })

  // Create a set of plannedWorkoutIds that are already represented by completed workouts
  // We'll use this to mark them as linked or hide them if we only want them nested
  const completedPlannedIds = new Set(workouts.map((w) => w.plannedWorkoutId).filter(Boolean))

  // Group activities by date for nutrition injection
  const activitiesByDate = new Map()

  // Process Goals
  for (const g of goals) {
    const goalDate = g.eventDate || g.targetDate
    if (!goalDate) continue

    const dateKey = goalDate.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }

    // Check if already added (safety)
    const existing = activitiesByDate.get(dateKey)
    if (existing.some((a: any) => a.id === g.id && a.source === 'goal')) continue

    activitiesByDate.get(dateKey).push({
      id: g.id,
      title: g.title,
      date: goalDate.toISOString(),
      type: 'Goal',
      source: 'goal',
      status: g.status === 'ACTIVE' ? 'active' : 'completed',
      priority: g.priority,
      metric: g.metric,
      targetValue: g.targetValue,
      description: g.description,
      nutrition: nutritionByDate.get(dateKey) || null,
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Process Metric History (Thresholds)
  for (const m of metricHistory) {
    const dateKey = m.date.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }

    const existing = activitiesByDate.get(dateKey)
    // Robust deduplication: check ID OR (Type + Value)
    if (
      existing.some(
        (a: any) =>
          a.source === 'threshold' &&
          (a.id === m.id || (a.metric === m.type && a.value === m.value))
      )
    )
      continue

    // Format type to be nicer (e.g. FTP -> FTP, THRESHOLD_PACE -> Threshold Pace)
    const displayType = m.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace('Ftp', 'FTP')
      .replace('Lthr', 'LTHR')
      .replace('Hr', 'HR')

    // Format values (handle pace/duration if needed)
    let formattedValue = m.value.toString()
    let formattedOldValue = m.oldValue?.toString()
    let unit = ''

    if (m.type === 'THRESHOLD_PACE') {
      const formatPace = (s: number) => {
        const min = Math.floor(s / 60)
        const sec = Math.round(s % 60)
        return `${min}:${sec.toString().padStart(2, '0')}`
      }
      formattedValue = formatPace(m.value)
      if (m.oldValue) formattedOldValue = formatPace(m.oldValue)
      unit = '/km'
    } else if (m.type.includes('HR')) {
      unit = ' bpm'
    } else if (m.type === 'FTP') {
      unit = 'W'
    }

    let title = `${displayType}: ${formattedValue}${unit}`
    if (m.oldValue !== null && formattedOldValue) {
      const change = m.value - m.oldValue
      // For pace, lower is better
      const isImprovement = m.type === 'THRESHOLD_PACE' ? change < 0 : change > 0
      const changePrefix = change >= 0 ? '+' : ''
      title = `${displayType}: ${formattedOldValue} → ${formattedValue}${unit}`
    }

    activitiesByDate.get(dateKey).push({
      id: m.id,
      title,
      date: m.date.toISOString(),
      type: 'Threshold',
      source: 'threshold',
      status: 'completed',
      metric: m.type,
      value: m.value,
      oldValue: m.oldValue,
      description: m.notes,
      nutrition: nutritionByDate.get(dateKey) || null,
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Process Personal Bests
  for (const pb of personalBests) {
    const dateKey = pb.date.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }

    const existing = activitiesByDate.get(dateKey)
    // Robust deduplication: check ID OR (Type + Value)
    if (
      existing.some(
        (a: any) =>
          a.source === 'pb' && (a.id === pb.id || (a.metric === pb.type && a.value === pb.value))
      )
    )
      continue

    // Format PB type (RUN_5K -> 5k Run, POWER_5S -> 5s Power)
    let displayType = pb.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    if (pb.type.startsWith('RUN_')) {
      const dist = pb.type.replace('RUN_', '')
      displayType = `${dist} Run`
    } else if (pb.type.startsWith('POWER_')) {
      const dur = pb.type.replace('POWER_', '')
      displayType = `${dur} Power`
    }

    // Format value (convert seconds to mm:ss for running PBs)
    let displayValue = `${pb.value}${pb.unit}`
    if (pb.type.startsWith('RUN_') && pb.unit.toLowerCase() === 's') {
      const min = Math.floor(pb.value / 60)
      const sec = Math.round(pb.value % 60)
      displayValue = `${min}:${sec.toString().padStart(2, '0')}`
    }

    activitiesByDate.get(dateKey).push({
      id: pb.id,
      title: `${displayType} (${displayValue})`,
      date: pb.date.toISOString(),
      type: 'PB',
      source: 'pb',
      status: 'completed',
      metric: pb.type,
      value: pb.value,
      unit: pb.unit,
      description: pb.notes,
      nutrition: nutritionByDate.get(dateKey) || null,
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Process Completed Workouts
  for (const w of workouts) {
    const dateKey = w.date.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }
    activitiesByDate.get(dateKey).push({
      id: w.id,
      title: w.title,
      date: w.date.toISOString(),
      type: w.type || 'Activity',
      source: 'completed',
      status: 'completed',

      // Metrics
      duration: w.durationSec,
      durationSec: w.durationSec,
      distance: w.distanceMeters,
      tss: w.tss,
      trainingLoad: w.trainingLoad, // icu_training_load
      trimp: w.trimp,
      intensity: w.intensity,
      averageHr: w.averageHr,

      // Power Metrics
      averageWatts: w.averageWatts,
      normalizedPower: w.normalizedPower,
      weightedAvgWatts: w.weightedAvgWatts,
      kilojoules: w.kilojoules,

      // Training Stress Metrics
      ctl: w.ctl,
      atl: w.atl,

      // Completed specific
      rpe: w.rpe,
      sessionRpe: w.sessionRpe,
      feel: w.feel,

      // Energy & Time
      calories: w.calories,
      elapsedTime: w.elapsedTimeSec,

      // Device & Metadata
      deviceName: w.deviceName,
      commute: w.commute,
      isPrivate: w.isPrivate,
      gearId: w.gearId,
      hasStreams: !!(w as any).streams,

      // Planned workout link
      plannedWorkoutId: w.plannedWorkoutId,
      linkedPlannedWorkout: (w as any).plannedWorkout
        ? {
            id: (w as any).plannedWorkout.id,
            title: (w as any).plannedWorkout.title,
            duration: (w as any).plannedWorkout.durationSec,
            durationSec: (w as any).plannedWorkout.durationSec,
            tss: (w as any).plannedWorkout.tss,
            type: (w as any).plannedWorkout.type
          }
        : null,

      // Original IDs for linking
      originalId: w.id,

      // Nutrition data for this date (will be same for all activities on the same day)
      nutrition: nutritionByDate.get(dateKey) || null,

      // Wellness data for this date
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Process Planned Workouts
  for (const p of plannedWorkouts) {
    // Skip planned workouts that are already completed and linked to an actual workout
    if (completedPlannedIds.has(p.id)) continue

    // Determine status
    let status = 'planned'
    if (p.completed) status = 'completed_plan'

    // Use UTC midnight as the source of truth for planned workouts
    const workoutDate = new Date(p.date)
    workoutDate.setUTCHours(0, 0, 0, 0)

    // Check if missed (in past and not completed)
    // Note: Rest days are never considered "missed" as resting is the objective
    const planDate = new Date(p.date)
    planDate.setUTCHours(0, 0, 0, 0)

    if (!p.completed && planDate < today) {
      status = p.type === 'Rest' ? 'completed_plan' : 'missed'
    }

    const dateKey = p.date.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }
    activitiesByDate.get(dateKey).push({
      id: p.id,
      title: p.title,
      date: workoutDate.toISOString(),
      startTime: p.startTime,
      type: p.type || 'Workout',
      source: 'planned',
      status: status,

      // Metrics (planned)
      duration: p.durationSec || 0,
      durationSec: p.durationSec || 0,
      distance: p.distanceMeters,
      tss: p.tss,
      intensity: p.workIntensity,

      // Planned specific
      plannedDuration: p.durationSec,
      plannedDistance: p.distanceMeters,
      plannedTss: p.tss,
      structuredWorkout: p.structuredWorkout,

      // Nutrition data for this date (will be same for all activities on the same day)
      nutrition: nutritionByDate.get(dateKey) || null,

      // Wellness data for this date
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Process Calendar Notes
  for (const n of calendarNotes) {
    const displayEndDate = getCalendarNoteDisplayEndDate(n)
    const dateKey = n.startDate.toISOString().split('T')[0]
    if (!activitiesByDate.has(dateKey)) {
      activitiesByDate.set(dateKey, [])
    }
    activitiesByDate.get(dateKey).push({
      id: n.id,
      title: n.title,
      date: n.startDate.toISOString(),
      endDate: n.endDate?.toISOString(),
      displayEndDate: displayEndDate?.toISOString() || null,
      isWeeklyNote: n.isWeeklyNote,
      type: n.type || 'Note',
      category: n.category,
      source: 'note',
      status: 'note',
      description: n.description,

      // Nutrition data for this date
      nutrition: nutritionByDate.get(dateKey) || null,

      // Wellness data for this date
      wellness: wellnessByDate.get(dateKey) || null
    })
  }

  // Ensure days with only wellness or nutrition data are included
  const allDates = new Set([...wellnessByDate.keys(), ...nutritionByDate.keys()])
  for (const dateKey of allDates) {
    if (!activitiesByDate.has(dateKey)) {
      const date = new Date(dateKey)
      activitiesByDate.set(dateKey, [
        {
          id: dateKey,
          title: 'Wellness',
          date: date.toISOString(),
          type: 'wellness',
          source: 'wellness',
          status: 'completed',
          nutrition: nutritionByDate.get(dateKey) || null,
          wellness: wellnessByDate.get(dateKey) || null
        }
      ])
    }
  }

  // Flatten activities array and ensure nutrition and wellness are attached to all activities
  const activities = []
  for (const [dateKey, dateActivities] of activitiesByDate.entries()) {
    const nutritionData = nutritionByDate.get(dateKey) || null
    const wellnessData = wellnessByDate.get(dateKey) || null
    for (const activity of dateActivities) {
      activities.push({
        ...activity,
        nutrition: nutritionData,
        wellness: wellnessData
      })
    }
  }

  return activities
})
