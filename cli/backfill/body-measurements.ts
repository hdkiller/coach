import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { bodyMeasurementService } from '../../server/utils/services/bodyMeasurementService'

const backfillBodyMeasurementsCommand = new Command('body-measurements')
const DEFAULT_BATCH_SIZE = 1000
const DEFAULT_CONCURRENCY = 20

type BodyMeasurementWriteInput = {
  userId: string
  recordedAt: Date
  metricKey: string
  value: number
  unit: string
  displayName?: string | null
  source: string
  sourceRefType?: string | null
  sourceRefId?: string | null
  notes?: string | null
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit)
    await Promise.all(chunk.map((item) => worker(item)))
  }
}

async function recordEntry(prisma: PrismaClient, input: BodyMeasurementWriteInput) {
  const normalized = bodyMeasurementService.normalizeMetricUnit(input.value, input.unit)

  if (input.sourceRefType && input.sourceRefId) {
    const existing = await prisma.bodyMeasurementEntry.findFirst({
      where: {
        userId: input.userId,
        metricKey: input.metricKey,
        source: input.source,
        sourceRefType: input.sourceRefType,
        sourceRefId: input.sourceRefId
      },
      select: {
        id: true,
        displayName: true,
        notes: true
      }
    })

    if (existing) {
      return prisma.bodyMeasurementEntry.update({
        where: { id: existing.id },
        data: {
          recordedAt: input.recordedAt,
          value: normalized.value,
          unit: normalized.unit,
          displayName: input.displayName ?? existing.displayName,
          notes: input.notes ?? existing.notes,
          isDeleted: false
        }
      })
    }
  }

  return prisma.bodyMeasurementEntry.create({
    data: {
      userId: input.userId,
      recordedAt: input.recordedAt,
      metricKey: input.metricKey,
      displayName: input.displayName ?? null,
      value: normalized.value,
      unit: normalized.unit,
      source: input.source,
      sourceRefType: input.sourceRefType ?? null,
      sourceRefId: input.sourceRefId ?? null,
      notes: input.notes ?? null
    }
  })
}

async function recordWellnessMetrics(
  prisma: PrismaClient,
  row: {
    id: string
    userId: string
    date: Date
    weight: number | null
    bodyFat: number | null
    lastSource: string | null
  }
) {
  const source = row.lastSource || 'wellness'
  const writes: Promise<unknown>[] = []

  if (row.weight != null) {
    writes.push(
      recordEntry(prisma, {
        userId: row.userId,
        recordedAt: row.date,
        metricKey: 'weight',
        value: row.weight,
        unit: 'kg',
        source,
        sourceRefType: 'wellness',
        sourceRefId: row.id
      })
    )
  }

  if (row.bodyFat != null) {
    writes.push(
      recordEntry(prisma, {
        userId: row.userId,
        recordedAt: row.date,
        metricKey: 'body_fat_pct',
        value: row.bodyFat,
        unit: 'pct',
        source,
        sourceRefType: 'wellness',
        sourceRefId: row.id
      })
    )
  }

  await Promise.all(writes)
}

backfillBodyMeasurementsCommand
  .description('Backfill body measurement ledger entries from existing wellness and profile data.')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--user-id <uuid>', 'Filter to a specific user ID')
  .option('--batch-size <number>', 'Rows to process per batch', String(DEFAULT_BATCH_SIZE))
  .option('--concurrency <number>', 'Concurrent writes per batch', String(DEFAULT_CONCURRENCY))
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null
    const userId = options.userId ? String(options.userId).trim() : null
    const batchSize = Math.max(1, parseInt(String(options.batchSize || DEFAULT_BATCH_SIZE), 10))
    const concurrency = Math.max(
      1,
      parseInt(String(options.concurrency || DEFAULT_CONCURRENCY), 10)
    )

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Database connection string not found.'))
      process.exit(1)
    }

    console.log(
      chalk.yellow(isProd ? '⚠️  Using PRODUCTION database.' : 'Using DEVELOPMENT database.')
    )

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const userFilter = userId ? { id: userId } : userEmail ? { email: userEmail } : {}
      const wellnessWhere = {
        ...(userId || userEmail ? { user: userFilter } : {}),
        OR: [{ weight: { not: null } }, { bodyFat: { not: null } }]
      }
      const usersWhere = {
        ...userFilter,
        OR: [{ height: { not: null } }, { weight: { not: null } }]
      }
      const [wellnessTotal, usersTotal] = await Promise.all([
        prisma.wellness.count({
          where: wellnessWhere
        }),
        prisma.user.count({
          where: usersWhere
        })
      ])

      console.log(chalk.cyan(`Wellness rows to process: ${wellnessTotal}`))
      console.log(chalk.cyan(`Users to scan: ${usersTotal}`))
      console.log(chalk.cyan(`Batch size: ${batchSize}`))
      console.log(chalk.cyan(`Concurrency: ${concurrency}`))

      let wellnessProcessed = 0
      let heightProcessed = 0
      let profileWeightProcessed = 0
      let usersScanned = 0
      let wellnessCursor: string | undefined
      let userCursor: string | undefined
      let wellnessBatchNumber = 0
      let userBatchNumber = 0

      while (true) {
        const wellnessRows = await prisma.wellness.findMany({
          where: wellnessWhere,
          select: {
            id: true,
            userId: true,
            date: true,
            weight: true,
            bodyFat: true,
            lastSource: true
          },
          orderBy: { id: 'asc' },
          take: batchSize,
          ...(wellnessCursor ? { skip: 1, cursor: { id: wellnessCursor } } : {})
        })

        if (wellnessRows.length === 0) break

        wellnessBatchNumber++
        await runWithConcurrency(wellnessRows, concurrency, async (row) => {
          await recordWellnessMetrics(prisma, row)
        })
        wellnessProcessed += wellnessRows.length
        wellnessCursor = wellnessRows[wellnessRows.length - 1]?.id

        console.log(
          chalk.gray(
            `Processed wellness batch ${wellnessBatchNumber}: ${wellnessProcessed} rows total`
          )
        )
      }

      while (true) {
        const users = await prisma.user.findMany({
          where: usersWhere,
          select: {
            id: true,
            height: true,
            weight: true
          },
          orderBy: { id: 'asc' },
          take: batchSize,
          ...(userCursor ? { skip: 1, cursor: { id: userCursor } } : {})
        })

        if (users.length === 0) break

        userBatchNumber++
        usersScanned += users.length
        const userIds = users.map((user) => user.id)
        const latestEntries = await prisma.bodyMeasurementEntry.findMany({
          where: {
            userId: { in: userIds },
            metricKey: { in: ['height', 'weight'] },
            isDeleted: false
          },
          select: {
            userId: true,
            metricKey: true,
            value: true,
            source: true,
            recordedAt: true
          },
          orderBy: [{ userId: 'asc' }, { metricKey: 'asc' }, { recordedAt: 'desc' }]
        })

        const latestByUserMetric = new Map<string, (typeof latestEntries)[number]>()
        for (const entry of latestEntries) {
          const key = `${entry.userId}:${entry.metricKey}`
          if (!latestByUserMetric.has(key)) latestByUserMetric.set(key, entry)
        }

        await runWithConcurrency(users, concurrency, async (user) => {
          if (user.height != null) {
            const latestHeight = latestByUserMetric.get(`${user.id}:height`)
            if (!latestHeight || Math.abs(latestHeight.value - user.height) > 0.01) {
              await recordEntry(prisma, {
                userId: user.id,
                recordedAt: new Date(),
                metricKey: 'height',
                value: user.height,
                unit: 'cm',
                source: 'profile_manual'
              })
              heightProcessed++
            }
          }

          if (user.weight != null) {
            const latestWeight = latestByUserMetric.get(`${user.id}:weight`)
            if (!latestWeight || Math.abs(latestWeight.value - user.weight) > 0.01) {
              await recordEntry(prisma, {
                userId: user.id,
                recordedAt: new Date(),
                metricKey: 'weight',
                value: user.weight,
                unit: 'kg',
                source: 'profile_manual'
              })
              profileWeightProcessed++
            }
          }
        })

        userCursor = users[users.length - 1]?.id

        console.log(
          chalk.gray(`Processed user batch ${userBatchNumber}: ${usersScanned} users total`)
        )
      }

      console.log(chalk.green('✅ Body measurements backfill complete.'))
      console.log(`Wellness rows processed: ${wellnessProcessed}`)
      console.log(`Profile heights recorded: ${heightProcessed}`)
      console.log(`Profile weights recorded: ${profileWeightProcessed}`)
      console.log(`Users scanned: ${usersScanned}`)
    } catch (error) {
      console.error(chalk.red('Error during body measurements backfill:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillBodyMeasurementsCommand
