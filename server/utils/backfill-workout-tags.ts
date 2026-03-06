import { Prisma, type PrismaClient } from '@prisma/client'
import { mergeWorkoutTags } from './workout-tags'

export interface BackfillWorkoutTagsOptions {
  limit: number
  dryRun: boolean
  cursor?: string | null
  log?: (message: string) => void
}

export interface BackfillWorkoutTagsResult {
  dryRun: boolean
  totalCandidates: number
  processed: number
  updated: number
  nextCursor: string | null
}

type BackfillPrismaClient = Pick<PrismaClient, 'workout' | '$queryRaw'>

export async function backfillWorkoutTags(
  prisma: BackfillPrismaClient,
  options: BackfillWorkoutTagsOptions
): Promise<BackfillWorkoutTagsResult> {
  const log = options.log ?? (() => {})

  const candidateFilter = (cursor?: string | null) => Prisma.sql`
    FROM "Workout"
    WHERE "source" = 'intervals'
      AND (
        CASE
          WHEN jsonb_typeof("rawJson"->'tags') = 'array'
            THEN jsonb_array_length("rawJson"->'tags')
          ELSE 0
        END
      ) > 0
      ${cursor ? Prisma.sql`AND "id" > ${cursor}` : Prisma.empty}
  `

  const [{ count: totalCandidates = 0 } = { count: 0 }] = await prisma.$queryRaw<
    Array<{ count: number }>
  >(Prisma.sql`
    SELECT COUNT(*)::int AS count
    ${candidateFilter(options.cursor)}
  `)

  let processed = 0
  let updated = 0
  let nextCursor = options.cursor || null

  while (true) {
    const batchRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      ${candidateFilter(nextCursor)}
      ORDER BY "id" ASC
      LIMIT ${options.limit}
    `)

    if (batchRows.length === 0) break

    const batchIds = batchRows.map((row) => row.id)
    const workouts = await prisma.workout.findMany({
      where: {
        id: { in: batchIds }
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        tags: true,
        rawJson: true
      }
    })

    log(
      `Processing batch of ${workouts.length} workouts (${processed}/${totalCandidates} complete) starting after ${nextCursor ?? 'START'}`
    )

    for (const workout of workouts) {
      processed++
      nextCursor = workout.id

      const raw = workout.rawJson as Record<string, unknown> | null
      const rawTags = Array.isArray(raw?.tags) ? raw.tags : undefined
      const nextTags = mergeWorkoutTags(workout.tags as string[], {
        incomingIntervalsTags: rawTags
      })

      const currentTags = Array.isArray(workout.tags) ? [...workout.tags].sort() : []
      if (JSON.stringify(currentTags) === JSON.stringify(nextTags)) continue

      updated++
      if (!options.dryRun) {
        await prisma.workout.update({
          where: { id: workout.id },
          data: { tags: nextTags }
        })
      }
    }
  }

  return {
    dryRun: options.dryRun,
    totalCandidates,
    processed,
    updated,
    nextCursor
  }
}
