import { normalizeSpO2Percentage } from './wellnessNormalization'

type MinimalPrisma = {
  wellness: {
    findMany: (args: Record<string, any>) => Promise<any[]>
    update: (args: Record<string, any>) => Promise<any>
  }
}

export interface BackfillWellnessSpO2Options {
  dryRun?: boolean
  limit?: number
  userId?: string | null
  log?: (message: string) => void
}

export interface BackfillWellnessSpO2Result {
  scanned: number
  matched: number
  updated: number
  skipped: number
  batches: number
  samples: Array<{
    id: string
    userId: string
    date: string
    oldSpO2: number
    newSpO2: number
    lastSource: string | null
  }>
}

export async function backfillWellnessSpO2(
  prisma: MinimalPrisma,
  options: BackfillWellnessSpO2Options = {}
): Promise<BackfillWellnessSpO2Result> {
  const dryRun = Boolean(options.dryRun)
  const limit = Math.max(1, options.limit ?? 500)
  const log = options.log ?? (() => {})

  const result: BackfillWellnessSpO2Result = {
    scanned: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    batches: 0,
    samples: []
  }

  let cursor: string | null = null

  while (true) {
    const batch = await prisma.wellness.findMany({
      where: {
        ...(options.userId ? { userId: options.userId } : {}),
        spO2: {
          gte: 0,
          lte: 1
        }
      },
      select: {
        id: true,
        userId: true,
        date: true,
        spO2: true,
        history: true,
        lastSource: true
      },
      orderBy: { id: 'asc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })

    if (batch.length === 0) {
      break
    }

    result.batches++
    cursor = batch[batch.length - 1]?.id ?? null

    for (const entry of batch) {
      result.scanned++

      if (typeof entry.spO2 !== 'number') {
        result.skipped++
        continue
      }

      const normalized = normalizeSpO2Percentage(entry.spO2)

      if (typeof normalized !== 'number' || normalized === entry.spO2) {
        result.skipped++
        continue
      }

      result.matched++

      const sample = {
        id: entry.id,
        userId: entry.userId,
        date: entry.date.toISOString().slice(0, 10),
        oldSpO2: entry.spO2,
        newSpO2: normalized,
        lastSource: entry.lastSource ?? null
      }

      if (result.samples.length < 10) {
        result.samples.push(sample)
      }

      log(
        `${dryRun ? '[DRY RUN] Would fix' : 'Fixing'} ${sample.date} (${sample.id}) ${sample.oldSpO2} -> ${sample.newSpO2}`
      )

      if (!dryRun) {
        const existingHistory = Array.isArray(entry.history) ? entry.history : []
        await prisma.wellness.update({
          where: { id: entry.id },
          data: {
            spO2: normalized,
            history: [
              ...existingHistory,
              {
                timestamp: new Date().toISOString(),
                source: 'backfill:wellness-spo2',
                changedFields: ['spO2'],
                changes: {
                  spO2: {
                    old: entry.spO2,
                    new: normalized
                  }
                }
              }
            ]
          }
        })
      }

      result.updated++
    }
  }

  return result
}
