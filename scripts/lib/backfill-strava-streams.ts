import type { Integration, PrismaClient } from '@prisma/client'
import { ingestStravaStreamsForWorkout } from '../../trigger/utils/strava-stream-ingestion'

export type StravaStreamBackfillOptions = {
  dryRun?: boolean
  limit?: number
  lastDays?: number
  from?: Date
  to?: Date
  userId?: string
  requireHrSignal?: boolean
  skipStressRecalc?: boolean
  requestsPerWindow?: number
  windowMs?: number
  delayMs?: number
  onProgress?: (event: StravaStreamBackfillProgress) => void
}

export type StravaStreamBackfillProgress = {
  phase: 'scan' | 'process'
  processed: number
  total: number
  workoutId?: string
  title?: string
  message?: string
}

export type StravaStreamBackfillResult = {
  scanned: number
  processed: number
  ingested: number
  unavailable: number
  skippedInvalidId: number
  skippedNoIntegration: number
  failed: number
  errors: Array<{ workoutId: string; title: string; error: string }>
}

type WorkoutCandidate = {
  id: string
  userId: string
  externalId: string
  title: string
  type: string | null
  date: Date
  averageHr: number | null
  averageWatts: number | null
}

class UserRateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  async acquire(userId: string) {
    const now = Date.now()
    let state = this.windows.get(userId)

    if (!state || now >= state.resetAt) {
      state = { count: 0, resetAt: now + this.windowMs }
      this.windows.set(userId, state)
    }

    if (state.count >= this.maxRequests) {
      const waitMs = Math.max(state.resetAt - now, 0)
      if (waitMs > 0) {
        await sleep(waitMs)
      }
      state = { count: 0, resetAt: Date.now() + this.windowMs }
      this.windows.set(userId, state)
    }

    state.count++
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('429') || message.toLowerCase().includes('rate limit')
}

function parseActivityId(externalId: string): number | null {
  const activityId = Number.parseInt(externalId, 10)
  return Number.isFinite(activityId) ? activityId : null
}

async function findStravaWorkoutsMissingStreams(
  prisma: PrismaClient,
  options: Pick<
    StravaStreamBackfillOptions,
    'limit' | 'lastDays' | 'from' | 'to' | 'userId' | 'requireHrSignal'
  >
): Promise<WorkoutCandidate[]> {
  const where: any = {
    source: 'strava',
    isDuplicate: false,
    streams: null,
    streamsV2: null
  }

  if (options.userId) {
    where.userId = options.userId
  }

  if (options.lastDays) {
    where.date = { gte: new Date(Date.now() - options.lastDays * 24 * 60 * 60 * 1000) }
  } else if (options.from || options.to) {
    where.date = {}
    if (options.from) where.date.gte = options.from
    if (options.to) where.date.lte = options.to
  }

  if (options.requireHrSignal) {
    where.OR = [
      { averageHr: { not: null } },
      { averageWatts: { not: null } },
      {
        rawJson: {
          path: ['has_heartrate'],
          equals: true
        }
      }
    ]
  }

  return prisma.workout.findMany({
    where,
    orderBy: [{ userId: 'asc' }, { date: 'desc' }],
    take: options.limit,
    select: {
      id: true,
      userId: true,
      externalId: true,
      title: true,
      type: true,
      date: true,
      averageHr: true,
      averageWatts: true
    }
  })
}

export async function runStravaStreamBackfill(
  prisma: PrismaClient,
  options: StravaStreamBackfillOptions = {}
): Promise<StravaStreamBackfillResult> {
  const result: StravaStreamBackfillResult = {
    scanned: 0,
    processed: 0,
    ingested: 0,
    unavailable: 0,
    skippedInvalidId: 0,
    skippedNoIntegration: 0,
    failed: 0,
    errors: []
  }

  const workouts = await findStravaWorkoutsMissingStreams(prisma, options)
  result.scanned = workouts.length

  options.onProgress?.({
    phase: 'scan',
    processed: 0,
    total: workouts.length,
    message: `Found ${workouts.length} workouts missing streams`
  })

  if (workouts.length === 0 || options.dryRun) {
    return result
  }

  const limiter = new UserRateLimiter(
    options.requestsPerWindow ?? 90,
    options.windowMs ?? 15 * 60 * 1000
  )
  const integrationCache = new Map<string, Integration | null>()

  for (const workout of workouts) {
    const activityId = parseActivityId(workout.externalId)
    if (activityId === null) {
      result.skippedInvalidId++
      result.processed++
      continue
    }

    let integration = integrationCache.get(workout.userId)
    if (integration === undefined) {
      integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: workout.userId,
            provider: 'strava'
          }
        }
      })
      integrationCache.set(workout.userId, integration)
    }

    if (!integration) {
      result.skippedNoIntegration++
      result.processed++
      continue
    }

    options.onProgress?.({
      phase: 'process',
      processed: result.processed,
      total: workouts.length,
      workoutId: workout.id,
      title: workout.title,
      message: `Ingesting ${workout.title}`
    })

    let attempts = 0
    while (attempts < 3) {
      attempts++
      try {
        await limiter.acquire(workout.userId)

        const ingestResult = await ingestStravaStreamsForWorkout({
          userId: workout.userId,
          workoutId: workout.id,
          activityId,
          integration,
          skipStressRecalc: options.skipStressRecalc ?? true
        })

        if (ingestResult.metrics.streamsUnavailable) {
          result.unavailable++
        } else {
          result.ingested++
        }

        break
      } catch (error) {
        if (isRateLimitError(error) && attempts < 3) {
          await sleep(60_000)
          continue
        }

        result.failed++
        result.errors.push({
          workoutId: workout.id,
          title: workout.title,
          error: error instanceof Error ? error.message : String(error)
        })
        break
      }
    }

    result.processed++

    if (options.delayMs && options.delayMs > 0) {
      await sleep(options.delayMs)
    }
  }

  return result
}
