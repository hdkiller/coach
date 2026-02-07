import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { calculateLlmCost } from '../../server/utils/ai-config'

const llmCommand = new Command('llm').description('LLM management commands')

llmCommand
  .command('update-model')
  .description('Update AI model preference for all users to Flash')
  .option('--prod', 'Use production database')
  .option('--dry', 'Dry run: print changes without applying them')
  .action(async (options) => {
    const isProd = options.prod
    const isDry = options.dry
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      if (isProd) {
        console.error(chalk.red('Make sure DATABASE_URL_PROD is set in .env'))
      } else {
        console.error(chalk.red('Make sure DATABASE_URL is set in .env'))
      }
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.blue('Fetching users...'))
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          aiModelPreference: true
        }
      })

      console.log(chalk.blue(`Found ${users.length} users.`))

      // Defined in server/utils/gemini.ts
      const MODEL_MAPPINGS: Record<string, string> = {
        flash: 'gemini-flash-latest',
        pro: 'gemini-3-pro-preview'
      }

      const TARGET_MODEL = 'flash'
      const TARGET_API_MODEL = MODEL_MAPPINGS[TARGET_MODEL]

      console.log(chalk.cyan('\n--- Configuration ---'))
      console.log(chalk.cyan(`Target DB Value: '${TARGET_MODEL}'`))
      console.log(chalk.cyan(`Maps to API Model: '${TARGET_API_MODEL}'`))
      console.log(chalk.cyan('---------------------\n'))

      let updatedCount = 0
      const currentModels: Record<string, number> = {}

      for (const user of users) {
        const rawValue = user.aiModelPreference || 'null'
        currentModels[rawValue] = (currentModels[rawValue] || 0) + 1

        if (user.aiModelPreference !== TARGET_MODEL) {
          if (isDry) {
            console.log(
              chalk.yellow(
                `[DRY] Would update user ${user.email} (${user.id}) from '${rawValue}' to '${TARGET_MODEL}'`
              )
            )
          } else {
            console.log(
              chalk.blue(
                `Updating user ${user.email} (${user.id}) from '${rawValue}' to '${TARGET_MODEL}'`
              )
            )
            await prisma.user.update({
              where: { id: user.id },
              data: { aiModelPreference: TARGET_MODEL }
            })
          }
          updatedCount++
        }
      }

      console.log('\n--- Current Database Distribution ---')
      for (const [model, count] of Object.entries(currentModels)) {
        const mapping = MODEL_MAPPINGS[model]
        const status = mapping ? `(Maps to: ${mapping})` : chalk.red('(Unknown/Legacy)')
        console.log(`  '${model}': ${count} users ${status}`)
      }
      console.log('-------------------------------------')

      if (isDry) {
        console.log(
          chalk.yellow(`\n[DRY] Would update ${updatedCount} users to '${TARGET_MODEL}'.`)
        )
      } else {
        console.log(chalk.green(`\nUpdated ${updatedCount} users to '${TARGET_MODEL}'.`))
      }
    } catch (e) {
      console.error(chalk.red('Error updating users:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

llmCommand
  .command('recalculate-costs')
  .description('Recalculate AI usage costs for a specific date')
  .option('--date <YYYY-MM-DD>', 'Target date (e.g., 2026-02-04)')
  .option('--prod', 'Use production database')
  .option('--dry', 'Dry run: print changes without applying them')
  .action(async (options) => {
    const isProd = options.prod
    const isDry = options.dry
    const dateStr = options.date

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const where: any = {
        success: true,
        promptTokens: { not: null },
        completionTokens: { not: null }
      }

      if (dateStr) {
        const startOfDay = new Date(`${dateStr}T00:00:00Z`)
        const endOfDay = new Date(`${dateStr}T23:59:59Z`)
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        }
      }

      console.log(
        chalk.blue(
          dateStr
            ? `Fetching LLM usage for ${dateStr}...`
            : 'Fetching all successful LLM usage records...'
        )
      )

      const usageRecords = await prisma.llmUsage.findMany({
        where,
        orderBy: { createdAt: 'asc' }
      })

      if (usageRecords.length === 0) {
        console.log(chalk.yellow('No records found.'))
        return
      }

      console.log(chalk.blue(`Found ${usageRecords.length} successful records.`))

      // Group records by date
      const recordsByDate: Record<string, typeof usageRecords> = {}
      for (const record of usageRecords) {
        const d = record.createdAt.toISOString().split('T')[0]
        if (!recordsByDate[d]) recordsByDate[d] = []
        recordsByDate[d].push(record)
      }

      const sortedDates = Object.keys(recordsByDate).sort()

      let overallTotalUpdated = 0
      let overallTotalOldCost = 0
      let overallTotalNewCost = 0

      for (const d of sortedDates) {
        const dayRecords = recordsByDate[d]
        let dayUpdated = 0
        let dayOldCost = 0
        let dayNewCost = 0

        console.log(chalk.bold(`\nProcessing ${d} (${dayRecords.length} records)...`))

        for (const record of dayRecords) {
          const newCost = calculateLlmCost(
            record.model,
            record.promptTokens || 0,
            (record.completionTokens || 0) + (record.reasoningTokens || 0),
            record.cachedTokens || 0
          )
          const oldCost = record.estimatedCost || 0

          dayOldCost += oldCost
          dayNewCost += newCost

          if (Math.abs(newCost - oldCost) > 0.000001) {
            if (!isDry) {
              await prisma.llmUsage.update({
                where: { id: record.id },
                data: { estimatedCost: newCost }
              })
            }
            dayUpdated++
          }
        }

        console.log(`  Records checked: ${dayRecords.length}`)
        console.log(`  Records with cost change: ${dayUpdated}`)
        console.log(`  Day Old Cost: $${dayOldCost.toFixed(4)}`)
        console.log(`  Day New Cost: $${dayNewCost.toFixed(4)}`)

        overallTotalUpdated += dayUpdated
        overallTotalOldCost += dayOldCost
        overallTotalNewCost += dayNewCost
      }

      console.log(chalk.cyan('\n--- Recalculation Summary ---'))
      if (dateStr) {
        console.log(chalk.cyan(`Date: ${dateStr}`))
      } else {
        console.log(chalk.cyan(`Dates processed: ${sortedDates.length}`))
      }
      console.log(chalk.cyan(`Total records checked: ${usageRecords.length}`))
      console.log(chalk.cyan(`Total records with cost change: ${overallTotalUpdated}`))
      console.log(chalk.cyan(`Total Old Cost: $${overallTotalOldCost.toFixed(4)}`))
      console.log(chalk.cyan(`Total New Cost: $${overallTotalNewCost.toFixed(4)}`))
      console.log(chalk.cyan('-----------------------------\n'))

      if (isDry) {
        console.log(chalk.yellow(`[DRY] Finished. No changes applied.`))
      } else {
        console.log(chalk.green(`Successfully updated ${overallTotalUpdated} records.`))
      }
    } catch (e) {
      console.error(chalk.red('Error recalculating costs:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

llmCommand
  .command('debug')
  .description('Debug recent LLM usage entries')
  .option('--limit <number>', 'Number of records to show', '10')
  .option('--user <email>', 'Filter by user email')
  .option('--prod', 'Use production database')
  .option('--full', 'Show full prompts and responses if available')
  .action(async (options) => {
    const isProd = options.prod
    const limit = parseInt(options.limit, 10)
    const userEmail = options.user
    const showFull = options.full

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      let userId = undefined
      if (userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true }
        })
        if (!user) {
          console.error(chalk.red(`User not found: ${userEmail}`))
          process.exit(1)
        }
        userId = user.id
      }

      const records = await prisma.llmUsage.findMany({
        where: userId ? { userId } : undefined,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              nickname: true
            }
          }
        }
      })

      if (records.length === 0) {
        console.log(chalk.yellow('No LLM usage records found.'))
        return
      }

      console.log(chalk.blue(`\nShowing last ${records.length} LLM usage records:\n`))

      for (const record of records) {
        const status = record.success ? chalk.green('SUCCESS') : chalk.red('FAILED')
        const cost = record.estimatedCost ? `$${record.estimatedCost.toFixed(4)}` : 'N/A'
        const time = record.createdAt.toLocaleString()

        console.log(chalk.bold('--------------------------------------------------'))
        console.log(`${chalk.cyan('ID:')} ${record.id} | ${chalk.cyan('Date:')} ${time}`)
        console.log(
          `${chalk.cyan('User:')} ${record.user?.email || 'System'} | ${chalk.cyan('Op:')} ${record.operation} | ${chalk.cyan('Model:')} ${record.model}`
        )
        console.log(
          `${chalk.cyan('Status:')} ${status} | ${chalk.cyan('Tokens:')} ${record.totalTokens} (In: ${record.promptTokens}, Cached: ${record.cachedTokens || 0}, Out: ${record.completionTokens}) | ${chalk.cyan('Cost:')} ${cost}`
        )

        if (record.cachedTokens && record.cachedTokens > 0) {
          // Calculate what it would have cost without caching
          const uncachedCost = calculateLlmCost(
            record.model,
            record.promptTokens || 0,
            (record.completionTokens || 0) + (record.reasoningTokens || 0),
            0
          )
          const savings = uncachedCost - (record.estimatedCost || 0)
          if (savings > 0) {
            console.log(chalk.green(`Cache Savings: $${savings.toFixed(4)}`))
          }
        }

        if (record.entityType) {
          console.log(`${chalk.cyan('Entity:')} ${record.entityType}:${record.entityId}`)
        }

        console.log(chalk.yellow('\nPrompt Preview:'))
        console.log(
          showFull && record.promptFull ? record.promptFull : record.promptPreview || 'N/A'
        )

        console.log(chalk.green('\nResponse Preview:'))
        console.log(
          showFull && record.responseFull ? record.responseFull : record.responsePreview || 'N/A'
        )

        if (!record.success && record.errorMessage) {
          console.log(chalk.red(`\nError: [${record.errorType}] ${record.errorMessage}`))
        }
        console.log('')
      }
    } catch (e) {
      console.error(chalk.red('Error fetching LLM usage:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

llmCommand
  .command('stats')
  .description('Show LLM usage statistics')
  .option('--days <number>', 'Number of days to look back', '7')
  .option('--date <YYYY-MM-DD>', 'Specific date to query (e.g., 2026-02-05)')
  .option('--timezone <string>', 'Timezone for daily breakdown (e.g., America/Los_Angeles)', 'UTC')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = options.prod
    const days = parseInt(options.days, 10)
    const dateStr = options.date
    const timezone = options.timezone

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const where: any = {}

      if (dateStr) {
        // Calculate start and end of day in the target timezone
        const startOfDay = new Date(`${dateStr}T00:00:00`)
        const endOfDay = new Date(`${dateStr}T23:59:59.999`)

        // To get the UTC range for a specific day in another timezone,
        // we can use the offset.
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          timeZoneName: 'shortOffset'
        })
        const parts = formatter.formatToParts(startOfDay)
        const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT'

        // Simpler approach: create dates and use their UTC equivalents
        // based on the offset of the target timezone at that specific time.
        // But for CLI stats, we can just fetch more and filter in memory to be 100% accurate
        const bufferStart = new Date(startOfDay)
        bufferStart.setHours(bufferStart.getHours() - 14) // Buffer for earliest possible TZ
        const bufferEnd = new Date(endOfDay)
        bufferEnd.setHours(bufferEnd.getHours() + 14) // Buffer for latest possible TZ

        where.createdAt = {
          gte: bufferStart,
          lte: bufferEnd
        }

        console.log(chalk.blue(`Fetching LLM usage statistics for ${dateStr} (${timezone})...`))
      } else {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        where.createdAt = {
          gte: startDate
        }
        console.log(chalk.blue(`Fetching LLM usage statistics for the past ${days} days...`))
      }

      let records = await prisma.llmUsage.findMany({
        where,
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Filter by timezone if specific date requested
      if (dateStr) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })

        records = records.filter((r) => {
          const parts = formatter.formatToParts(r.createdAt)
          const year = parts.find((p) => p.type === 'year')?.value
          const month = parts.find((p) => p.type === 'month')?.value
          const day = parts.find((p) => p.type === 'day')?.value
          return `${year}-${month}-${day}` === dateStr
        })
      }

      if (records.length === 0) {
        console.log(chalk.yellow(`No records found for the specified period.`))
        return
      }

      const statsByModel: Record<
        string,
        {
          count: number
          promptTokens: number
          completionTokens: number
          reasoningTokens: number
          cachedTokens: number
          cost: number
        }
      > = {}

      let totalReasoningTokens = 0
      let totalCost = 0

      for (const record of records) {
        const model = record.model
        if (!statsByModel[model]) {
          statsByModel[model] = {
            count: 0,
            promptTokens: 0,
            completionTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            cost: 0
          }
        }

        statsByModel[model].count++
        statsByModel[model].promptTokens += record.promptTokens || 0
        statsByModel[model].completionTokens += record.completionTokens || 0
        statsByModel[model].reasoningTokens += record.reasoningTokens || 0
        statsByModel[model].cachedTokens += record.cachedTokens || 0
        statsByModel[model].cost += record.estimatedCost || 0

        totalReasoningTokens += record.reasoningTokens || 0
        totalCost += record.estimatedCost || 0
      }

      const periodLabel = dateStr ? dateStr : `Past ${days} Days`
      console.log(chalk.cyan(`\n--- LLM Usage Stats (${periodLabel}) ---`))
      console.log(`Total Requests: ${records.length}`)
      console.log(`Total Reasoning Tokens: ${chalk.bold(totalReasoningTokens)}`)
      console.log(`Total Estimated Cost: $${totalCost.toFixed(4)}`)

      if (!dateStr) {
        console.log(chalk.cyan(`\nDaily Breakdown (${timezone}):`))
        const dailyCounts: Record<string, number> = {}

        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })

        for (const record of records) {
          const parts = formatter.formatToParts(record.createdAt)
          const year = parts.find((p) => p.type === 'year')?.value
          const month = parts.find((p) => p.type === 'month')?.value
          const day = parts.find((p) => p.type === 'day')?.value
          const d = `${year}-${month}-${day}`
          dailyCounts[d] = (dailyCounts[d] || 0) + 1
        }
        Object.entries(dailyCounts)
          .sort()
          .forEach(([day, count]) => {
            console.log(`  ${day}: ${count} requests`)
          })
      }

      console.log('-------------------------------------------\n')

      for (const [model, stats] of Object.entries(statsByModel)) {
        console.log(chalk.bold.green(`Model: ${model}`))
        console.log(`  Requests: ${stats.count}`)
        console.log(`  Prompt Tokens: ${stats.promptTokens.toLocaleString()}`)
        console.log(`  Completion Tokens: ${stats.completionTokens.toLocaleString()}`)
        console.log(`  Reasoning Tokens: ${chalk.yellow(stats.reasoningTokens.toLocaleString())}`)
        console.log(`  Cached Tokens: ${stats.cachedTokens.toLocaleString()}`)
        console.log(`  Estimated Cost: $${stats.cost.toFixed(4)}`)
        console.log('')
      }

      // Operation breakdown for reasoning tokens and costs
      const statsByOp: Record<
        string,
        { reasoning: number[]; costs: number[]; users: Set<string> }
      > = {}
      for (const record of records) {
        const op = record.operation || 'unknown'
        if (!statsByOp[op]) {
          statsByOp[op] = { reasoning: [], costs: [], users: new Set() }
        }
        statsByOp[op].reasoning.push(record.reasoningTokens || 0)
        statsByOp[op].costs.push(record.estimatedCost || 0)
        if (record.userId) {
          statsByOp[op].users.add(record.userId)
        }
      }

      console.log(chalk.cyan(`\n--- Operation Breakdown (${periodLabel}) ---`))
      console.log(
        chalk.dim(
          `${'Operation'.padEnd(30)} | ${'Cost'.padStart(8)} | ${'Avg/Usr'.padStart(8)} | ${'Usrs'.padStart(5)} | ${'Reason'.padStart(8)} | ${'Count'.padStart(6)}`
        )
      )
      console.log(chalk.dim('-'.repeat(85)))

      Object.entries(statsByOp)
        .sort((a, b) => {
          const sumA = a[1].costs.reduce((s, v) => s + v, 0)
          const sumB = b[1].costs.reduce((s, v) => s + v, 0)
          return sumB - sumA
        })
        .forEach(([op, stats]) => {
          const count = stats.costs.length
          const totalCost = stats.costs.reduce((s, v) => s + v, 0)
          const userCount = stats.users.size || 1 // Avoid division by zero
          const costPerUser = totalCost / userCount
          const avgReasoning = Math.round(
            stats.reasoning.reduce((s, v) => s + v, 0) / stats.reasoning.length
          )

          console.log(
            `${op.padEnd(30)} | $${totalCost.toFixed(2).padStart(7)} | $${costPerUser.toFixed(2).padStart(7)} | ${userCount.toString().padStart(5)} | ${avgReasoning.toString().padStart(8)} | ${count.toString().padStart(6)}`
          )
        })

      const recordsWithReasoning = records.filter((r) => (r.reasoningTokens || 0) > 0)
      if (recordsWithReasoning.length > 0) {
        console.log(chalk.cyan(`\n--- Recent Requests with Reasoning Tokens ---`))
        for (const r of recordsWithReasoning.slice(-5)) {
          console.log(
            `  ${r.createdAt.toISOString()} | ${r.model} | Reasoning: ${chalk.yellow(r.reasoningTokens)} | Op: ${r.operation}`
          )
        }
      }
    } catch (e) {
      console.error(chalk.red('Error fetching LLM stats:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

llmCommand
  .command('top')
  .description('Show the most expensive or token-heavy LLM requests')
  .option('--limit <number>', 'Number of records to show', '10')
  .option('--days <number>', 'Number of days to look back', '7')
  .option('--sort <type>', 'Sort by cost, reasoning, or total', 'cost')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = options.prod
    const limit = parseInt(options.limit, 10)
    const days = parseInt(options.days, 10)
    const sortType = options.sort

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      console.log(chalk.blue(`Fetching top ${limit} requests sorted by ${sortType}...`))

      const orderBy: any = {}
      if (sortType === 'reasoning') orderBy.reasoningTokens = 'desc'
      else if (sortType === 'total') orderBy.totalTokens = 'desc'
      else orderBy.estimatedCost = 'desc'

      const records = await prisma.llmUsage.findMany({
        where: { createdAt: { gte: startDate } },
        take: limit,
        orderBy,
        include: {
          user: {
            select: { email: true }
          }
        }
      })

      console.log(chalk.cyan(`\n--- Top LLM Requests (Past ${days} Days) ---`))
      console.log(
        chalk.dim(
          `${'ID'.padEnd(38)} | ${'Op'.padEnd(20)} | ${'Model'.padEnd(20)} | ${'Cost'.padStart(8)} | ${'Reason'.padStart(8)}`
        )
      )
      console.log(chalk.dim('-'.repeat(105)))

      for (const r of records) {
        const cost = `$${(r.estimatedCost || 0).toFixed(4)}`
        const reason = r.reasoningTokens?.toLocaleString() || '0'
        console.log(
          `${r.id.padEnd(38)} | ${r.operation.padEnd(20)} | ${r.model.padEnd(20)} | ${cost.padStart(8)} | ${reason.padStart(8)}`
        )
      }
    } catch (e) {
      console.error(chalk.red('Error fetching top requests:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default llmCommand
