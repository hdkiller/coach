import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { normalizeIntervalsWellness } from '../../server/utils/intervals'

const backfillWellnessScoresCommand = new Command('wellness-scores')

backfillWellnessScoresCommand
  .description('Fix wellness scores (mood/soreness) from rawJson (normalize Intervals 1-4 scale)')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--limit <number>', 'Limit the number of records to process', '100000')
  .action(async (options) => {
    const isProd = options.prod
    const isDryRun = options.dryRun
    const limit = parseInt(options.limit)

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be saved.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.gray('Fetching Wellness entries count...'))
      const totalCount = await prisma.wellness.count({
        where: { rawJson: { not: Prisma.JsonNull } }
      })
      console.log(chalk.gray(`Found ${totalCount} wellness entries total.`))

      let cursor: string | undefined
      let processedCount = 0
      let fixedCount = 0
      let skippedCount = 0
      const batchSize = 500

      while (true) {
        const wellnessEntries = await prisma.wellness.findMany({
          where: {
            rawJson: { not: Prisma.JsonNull }
          },
          take: batchSize,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' } // Stable sort for cursor
        })

        if (wellnessEntries.length === 0) break

        cursor = wellnessEntries[wellnessEntries.length - 1].id

        const updates: Promise<any>[] = []

        for (const entry of wellnessEntries) {
          processedCount++
          const raw = entry.rawJson as any
          if (!raw) {
            skippedCount++
            continue
          }

          const normalized = normalizeIntervalsWellness(raw, entry.userId, entry.date)
          const updateData: any = {}
          let needsUpdate = false

          // Check fields
          const fields = ['mood', 'soreness', 'stress', 'fatigue', 'sleepQuality', 'motivation']
          for (const field of fields) {
            const newVal = (normalized as any)[field]
            const currentVal = (entry as any)[field]
            if (newVal !== null && newVal !== currentVal) {
              updateData[field] = newVal
              needsUpdate = true
            }
          }

          if (needsUpdate) {
            if (isDryRun) {
              // Log only first few in dry run to avoid spam
              if (fixedCount < 20) {
                console.log(
                  chalk.green(`[DRY RUN] Update for ${entry.date.toISOString().split('T')[0]}`)
                )
                for (const [k, v] of Object.entries(updateData)) {
                  console.log(chalk.gray(`  ${k}: ${(entry as any)[k]} -> ${v}`))
                }
              }
            } else {
              // Push promise
              updates.push(
                prisma.wellness.update({
                  where: { id: entry.id },
                  data: updateData
                })
              )
            }
            fixedCount++
          } else {
            skippedCount++
          }
        }

        // Execute batch updates
        if (updates.length > 0) {
          await Promise.all(updates)
        }

        // Progress
        if (processedCount % 1000 === 0) {
          console.log(chalk.gray(`Processed ${processedCount}/${totalCount}...`))
        }
      }

      console.log('\n')
      console.log(chalk.bold('Summary:'))
      console.log(`Total Processed: ${processedCount}`)
      console.log(`Fixed:           ${fixedCount}`)
      console.log(`Skipped:         ${skippedCount}`)

      if (isDryRun) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillWellnessScoresCommand
