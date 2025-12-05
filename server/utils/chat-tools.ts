import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'

/**
 * Tool schemas for Gemini function calling
 * These define what tools the AI can use to fetch data from the database
 */
export const chatToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_recent_workouts',
    description: 'Fetch recent workout summaries for the athlete. Use this when the user asks about their recent activities, training, or wants to compare workouts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: 'Number of workouts to fetch (default: 5, max: 20)',
        },
        type: {
          type: SchemaType.STRING,
          description: 'Filter by workout type (e.g., Ride, Run, Swim)',
        },
        days: {
          type: SchemaType.NUMBER,
          description: 'Only include workouts from the last N days',
        },
      },
    },
  },
  {
    name: 'get_workout_details',
    description: 'Get comprehensive details for a specific workout by ID. Use this when you need detailed information about a specific workout that was mentioned or identified.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        workout_id: {
          type: SchemaType.STRING,
          description: 'The workout ID to fetch details for',
        },
      },
      required: ['workout_id'],
    },
  },
  {
    name: 'get_nutrition_log',
    description: 'Get nutrition data for specific dates. Use this when the user asks about their eating, meals, macros, or calories.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        end_date: {
          type: SchemaType.STRING,
          description: 'End date in ISO format (YYYY-MM-DD). If not provided, defaults to start_date',
        },
      },
      required: ['start_date'],
    },
  },
  {
    name: 'get_wellness_metrics',
    description: 'Fetch wellness and recovery metrics (HRV, sleep, recovery score, etc.). Use this when user asks about recovery, sleep, or how they are feeling.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start_date: {
          type: SchemaType.STRING,
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        end_date: {
          type: SchemaType.STRING,
          description: 'End date in ISO format (YYYY-MM-DD). If not provided, defaults to start_date',
        },
      },
      required: ['start_date'],
    },
  },
  {
    name: 'search_workouts',
    description: 'Search workouts by various criteria. Use this for more complex queries like finding workouts within a specific duration range or TSS range.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Text search in title or description',
        },
        min_duration_minutes: {
          type: SchemaType.NUMBER,
          description: 'Minimum workout duration in minutes',
        },
        max_duration_minutes: {
          type: SchemaType.NUMBER,
          description: 'Maximum workout duration in minutes',
        },
        min_tss: {
          type: SchemaType.NUMBER,
          description: 'Minimum Training Stress Score',
        },
        date_from: {
          type: SchemaType.STRING,
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        date_to: {
          type: SchemaType.STRING,
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'Maximum number of results (default: 10, max: 20)',
        },
      },
    },
  },
]

/**
 * Main tool execution handler
 * Routes tool calls to the appropriate handler function
 */
export async function executeToolCall(
  toolName: string,
  args: any,
  userId: string
): Promise<any> {
  try {
    switch (toolName) {
      case 'get_recent_workouts':
        return await getRecentWorkouts(userId, args.limit, args.type, args.days)

      case 'get_workout_details':
        return await getWorkoutDetails(userId, args.workout_id)

      case 'get_nutrition_log':
        return await getNutritionLog(userId, args.start_date, args.end_date)

      case 'get_wellness_metrics':
        return await getWellnessMetrics(userId, args.start_date, args.end_date)

      case 'search_workouts':
        return await searchWorkouts(userId, args)

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error)
    return { error: `Failed to execute ${toolName}: ${error?.message || 'Unknown error'}` }
  }
}

/**
 * Fetch recent workout summaries
 */
async function getRecentWorkouts(
  userId: string,
  limit = 5,
  type?: string,
  days?: number
): Promise<any> {
  const where: any = { userId }

  if (type) {
    where.type = type
  }

  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    where.date = { gte: cutoff }
  }

  const workouts = await prisma.workout.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(limit || 5, 20),
    select: {
      id: true,
      date: true,
      title: true,
      type: true,
      durationSec: true,
      distanceMeters: true,
      averageWatts: true,
      normalizedPower: true,
      averageHr: true,
      maxHr: true,
      averageCadence: true,
      tss: true,
      intensity: true,
      trainingLoad: true,
      kilojoules: true,
      elevationGain: true,
      averageSpeed: true,
      rpe: true,
      feel: true,
      description: true,
    },
  })

  if (workouts.length === 0) {
    return { message: 'No workouts found matching the criteria' }
  }

  return {
    count: workouts.length,
    workouts: workouts.map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      title: w.title,
      type: w.type,
      duration_minutes: Math.round(w.durationSec / 60),
      distance_km: w.distanceMeters ? (w.distanceMeters / 1000).toFixed(1) : null,
      avg_power: w.averageWatts,
      normalized_power: w.normalizedPower,
      avg_hr: w.averageHr,
      max_hr: w.maxHr,
      avg_cadence: w.averageCadence,
      tss: w.tss ? Math.round(w.tss) : null,
      intensity_factor: w.intensity ? w.intensity.toFixed(2) : null,
      training_load: w.trainingLoad ? Math.round(w.trainingLoad) : null,
      kilojoules: w.kilojoules,
      elevation_gain: w.elevationGain,
      avg_speed_kmh: w.averageSpeed ? (w.averageSpeed * 3.6).toFixed(1) : null,
      rpe: w.rpe,
      feel: w.feel,
      description: w.description,
    })),
  }
}

/**
 * Get comprehensive details for a specific workout
 */
async function getWorkoutDetails(userId: string, workoutId: string): Promise<any> {
  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      userId,
    },
  })

  if (!workout) {
    return { error: 'Workout not found' }
  }

  return {
    id: workout.id,
    date: workout.date.toISOString(),
    title: workout.title,
    description: workout.description,
    type: workout.type,
    source: workout.source,
    duration_minutes: Math.round(workout.durationSec / 60),
    distance_km: workout.distanceMeters ? (workout.distanceMeters / 1000).toFixed(1) : null,
    metrics: {
      power: {
        average: workout.averageWatts,
        normalized: workout.normalizedPower,
        max: workout.maxWatts,
        weighted_avg: workout.weightedAvgWatts,
      },
      heart_rate: {
        average: workout.averageHr,
        max: workout.maxHr,
      },
      cadence: {
        average: workout.averageCadence,
        max: workout.maxCadence,
      },
      training: {
        tss: workout.tss ? Math.round(workout.tss) : null,
        training_load: workout.trainingLoad ? Math.round(workout.trainingLoad) : null,
        intensity_factor: workout.intensity ? workout.intensity.toFixed(2) : null,
        kilojoules: workout.kilojoules,
      },
      performance: {
        variability_index: workout.variabilityIndex ? workout.variabilityIndex.toFixed(2) : null,
        power_hr_ratio: workout.powerHrRatio ? workout.powerHrRatio.toFixed(2) : null,
        efficiency_factor: workout.efficiencyFactor ? workout.efficiencyFactor.toFixed(2) : null,
        decoupling: workout.decoupling ? workout.decoupling.toFixed(1) : null,
      },
      fitness: {
        ctl: workout.ctl ? Math.round(workout.ctl) : null,
        atl: workout.atl ? Math.round(workout.atl) : null,
      },
    },
    elevation_gain: workout.elevationGain,
    avg_speed_kmh: workout.averageSpeed ? (workout.averageSpeed * 3.6).toFixed(1) : null,
    subjective: {
      rpe: workout.rpe,
      session_rpe: workout.sessionRpe,
      feel: workout.feel,
    },
    environmental: {
      avg_temp: workout.avgTemp,
      indoor_trainer: workout.trainer,
    },
    balance: {
      lr_balance: workout.lrBalance ? workout.lrBalance.toFixed(1) : null,
    },
    ai_analysis: workout.aiAnalysis || null,
    ai_analysis_json: workout.aiAnalysisJson || null,
  }
}

/**
 * Get nutrition log for date range
 */
async function getNutritionLog(
  userId: string,
  startDate: string,
  endDate?: string
): Promise<any> {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(startDate)

  end.setHours(23, 59, 59, 999)

  const nutritionEntries = await prisma.nutrition.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
      sugar: true,
      aiAnalysis: true,
      aiAnalysisJson: true,
    },
  })

  if (nutritionEntries.length === 0) {
    return { message: 'No nutrition data found for the specified date range' }
  }

  return {
    count: nutritionEntries.length,
    date_range: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    entries: nutritionEntries.map((entry) => ({
      id: entry.id,
      date: entry.date.toISOString().split('T')[0],
      macros: {
        calories: entry.calories,
        protein: entry.protein ? Math.round(entry.protein) : null,
        carbs: entry.carbs ? Math.round(entry.carbs) : null,
        fat: entry.fat ? Math.round(entry.fat) : null,
        fiber: entry.fiber ? Math.round(entry.fiber) : null,
        sugar: entry.sugar ? Math.round(entry.sugar) : null,
      },
      ai_analysis: entry.aiAnalysis || null,
      ai_analysis_json: entry.aiAnalysisJson || null,
    })),
    totals: {
      calories: nutritionEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
      protein: nutritionEntries.reduce((sum, e) => sum + (e.protein || 0), 0),
      carbs: nutritionEntries.reduce((sum, e) => sum + (e.carbs || 0), 0),
      fat: nutritionEntries.reduce((sum, e) => sum + (e.fat || 0), 0),
    },
  }
}

/**
 * Get wellness metrics for date range
 */
async function getWellnessMetrics(
  userId: string,
  startDate: string,
  endDate?: string
): Promise<any> {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(startDate)

  end.setHours(23, 59, 59, 999)

  const wellness = await prisma.wellness.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      recoveryScore: true,
      hrv: true,
      restingHr: true,
      sleepHours: true,
      sleepScore: true,
      spO2: true,
      readiness: true,
      fatigue: true,
      soreness: true,
      stress: true,
      mood: true,
    },
  })

  if (wellness.length === 0) {
    return { message: 'No wellness data found for the specified date range' }
  }

  return {
    count: wellness.length,
    date_range: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    metrics: wellness.map((w) => ({
      date: w.date.toISOString().split('T')[0],
      recovery: {
        recovery_score: w.recoveryScore,
        hrv: w.hrv,
        resting_hr: w.restingHr,
        readiness: w.readiness,
      },
      sleep: {
        hours: w.sleepHours,
        score: w.sleepScore,
        spo2: w.spO2,
      },
      subjective: {
        fatigue: w.fatigue,
        soreness: w.soreness,
        stress: w.stress,
        mood: w.mood,
      },
    })),
  }
}

/**
 * Search workouts with advanced filters
 */
async function searchWorkouts(userId: string, args: any): Promise<any> {
  const where: any = { userId }

  if (args.query) {
    where.OR = [
      { title: { contains: args.query, mode: 'insensitive' } },
      { description: { contains: args.query, mode: 'insensitive' } },
    ]
  }

  if (args.min_duration_minutes) {
    where.durationSec = { gte: args.min_duration_minutes * 60 }
  }

  if (args.max_duration_minutes) {
    where.durationSec = where.durationSec || {}
    where.durationSec.lte = args.max_duration_minutes * 60
  }

  if (args.min_tss) {
    where.tss = { gte: args.min_tss }
  }

  if (args.date_from) {
    where.date = { gte: new Date(args.date_from) }
  }

  if (args.date_to) {
    where.date = where.date || {}
    where.date.lte = new Date(args.date_to)
  }

  const workouts = await prisma.workout.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(args.limit || 10, 20),
    select: {
      id: true,
      date: true,
      title: true,
      type: true,
      durationSec: true,
      distanceMeters: true,
      averageWatts: true,
      averageHr: true,
      tss: true,
      intensity: true,
      description: true,
    },
  })

  if (workouts.length === 0) {
    return { message: 'No workouts found matching the search criteria' }
  }

  return {
    count: workouts.length,
    workouts: workouts.map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      title: w.title,
      type: w.type,
      duration_minutes: Math.round(w.durationSec / 60),
      distance_km: w.distanceMeters ? (w.distanceMeters / 1000).toFixed(1) : null,
      avg_power: w.averageWatts,
      avg_hr: w.averageHr,
      tss: w.tss ? Math.round(w.tss) : null,
      intensity_factor: w.intensity ? w.intensity.toFixed(2) : null,
      description: w.description,
    })),
  }
}