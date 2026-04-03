import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const replayWebhooksCommand = new Command('replay-webhooks')

replayWebhooksCommand
  .description('Replay stored Intervals wellness webhook payloads for a specific athlete')
  .argument('<query>', 'User email, ID, or name')
  .option('--prod', 'Use production database')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--include-fitness', 'Also replay FITNESS_UPDATED payloads')
  .option('--limit <number>', 'Limit matching webhook logs', '500')
  .option('--apply', 'Actually write changes instead of previewing')
  .action(async (query, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Database connection string is not defined.'))
      process.exit(1)
    }

    console.log(chalk[isProd ? 'yellow' : 'blue'](isProd ? 'Using PRODUCTION database.' : 'Using DEVELOPMENT database.'))

    process.env.DATABASE_URL = connectionString
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    ;(globalThis as any).prismaGlobalV2 = prisma

    const { IntervalsService } = await import('../../../server/utils/services/intervalsService')

    const limit = Math.max(1, Number.parseInt(options.limit, 10) || 500)
    const eventTypes = options.includeFitness
      ? ['WELLNESS_UPDATED', 'FITNESS_UPDATED']
      : ['WELLNESS_UPDATED']

    try {
      const uuidLike =
        typeof query === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)

      const user =
        (uuidLike
          ? await prisma.user.findUnique({
              where: { id: query },
              select: {
                id: true,
                email: true,
                name: true
              }
            })
          : null) ||
        (query.includes('@')
          ? await prisma.user.findFirst({
              where: {
                email: { equals: query, mode: 'insensitive' }
              },
              select: {
                id: true,
                email: true,
                name: true
              }
            })
          : null) ||
        (query.includes('@')
          ? await prisma.user.findFirst({
              where: {
                email: { contains: query, mode: 'insensitive' }
              },
              select: {
                id: true,
                email: true,
                name: true
              }
            })
          : null) ||
        (query
          ? await prisma.user.findFirst({
              where: {
                name: { contains: query, mode: 'insensitive' }
              },
              select: {
                id: true,
                email: true,
                name: true
              }
            })
          : null)

      if (!user) {
        console.error(chalk.red(`User not found matching "${query}".`))
        process.exit(1)
      }

      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: 'intervals'
          }
        },
        select: {
          externalUserId: true
        }
      })

      if (!integration?.externalUserId) {
        console.error(
          chalk.red(`Intervals integration with externalUserId not found for ${user.email || user.id}.`)
        )
        process.exit(1)
      }

      const startDate = options.startDate ? new Date(`${options.startDate}T00:00:00Z`) : null
      const endDate = options.endDate ? new Date(`${options.endDate}T23:59:59.999Z`) : null

      console.log(
        chalk.gray(
          `Scanning ${eventTypes.join(', ')} webhook logs for athlete ${integration.externalUserId}...`
        )
      )

      const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''")
      const eventTypeList = eventTypes.map((type) => `'${escapeSqlLiteral(type)}'`).join(', ')
      const statusList = ['PROCESSED', 'QUEUED', 'PENDING']
        .map((status) => `'${status}'`)
        .join(', ')
      const athleteIdLiteral = escapeSqlLiteral(integration.externalUserId)

      const logs = (await prisma.$queryRawUnsafe(`
        SELECT id, "createdAt", "eventType", status, payload
        FROM "WebhookLog"
        WHERE provider = 'intervals'
          AND "eventType" IN (${eventTypeList})
          AND status IN (${statusList})
          AND payload::text LIKE '%${athleteIdLiteral}%'
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `)) as Array<{
        id: string
        createdAt: Date
        eventType: string | null
        status: string
        payload: unknown
      }>

      const matched: Array<{
        logId: string
        createdAt: Date
        eventType: string
        records: any[]
      }> = []

      for (const log of logs) {
        const payload =
          typeof log.payload === 'string'
            ? (() => {
                try {
                  return JSON.parse(log.payload)
                } catch {
                  return null
                }
              })()
            : (log.payload as any)
        const events = Array.isArray(payload?.events) ? payload.events : []

        for (const event of events) {
          if (event?.athlete_id !== integration.externalUserId) continue
          if (!eventTypes.includes(String(event?.type || ''))) continue

          const records = Array.isArray(event?.records) ? event.records : []
          const filteredRecords = records.filter((record) => {
            if (typeof record?.id !== 'string') return false
            const date = new Date(`${record.id}T00:00:00Z`)
            if (Number.isNaN(date.getTime())) return false
            if (startDate && date < startDate) return false
            if (endDate && date > endDate) return false
            return true
          })

          if (filteredRecords.length === 0) continue

          matched.push({
            logId: log.id,
            createdAt: log.createdAt,
            eventType: String(event.type),
            records: filteredRecords
          })
        }
      }

      const totalRecords = matched.reduce((sum, item) => sum + item.records.length, 0)
      matched.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())

      console.log(chalk.green(`Matched ${matched.length} webhook event payload(s), ${totalRecords} record(s).`))
      for (const item of matched.slice(0, 20)) {
        const firstDate = item.records[0]?.id
        const lastDate = item.records[item.records.length - 1]?.id
        console.log(
          chalk.gray(
            `- ${item.createdAt.toISOString()} ${item.eventType} ${item.logId} (${item.records.length} record(s): ${firstDate}${lastDate && lastDate !== firstDate ? ` -> ${lastDate}` : ''})`
          )
        )
      }
      if (matched.length > 20) {
        console.log(chalk.gray(`...and ${matched.length - 20} more payload(s)`))
      }

      if (!options.apply) {
        console.log(chalk.yellow('Preview only. Re-run with --apply to write the replayed records.'))
        return
      }

      let upserted = 0
      for (const item of matched) {
        upserted += await IntervalsService.ingestWebhookWellnessRecords(user.id, item.records, {
          mode: item.eventType === 'FITNESS_UPDATED' ? 'fitness' : 'wellness'
        })
      }

      console.log(chalk.green(`Replay completed. New wellness rows created: ${upserted}.`))
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default replayWebhooksCommand
