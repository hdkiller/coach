import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { parseFitFile, extractFitExtrasMeta } from '../../server/utils/fit'

const backfillFitExtrasMetaCommand = new Command('fit-extras-meta')
  .description('Backfill WorkoutStream.extrasMeta from stored FitFile binaries')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without writing updates', false)
  .option('--all', 'Recompute even when extrasMeta already exists', false)
  .option('--limit <number>', 'Limit number of FitFiles processed', '500')
  .option('--fitfile-id <id>', 'Process a specific FitFile ID')
  .option('--user <emailOrId>', 'Filter FitFiles by user email or user ID')
  .action(async (options) => {
    const isProd = !!options.prod
    const isDryRun = !!options.dryRun
    const includeAll = !!options.all
    const limit = Math.max(1, parseInt(String(options.limit || '500'), 10) || 500)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD in environment'))
      process.exit(1)
    }

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }
    if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be written.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      let userId: string | null = null
      if (options.user) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ id: String(options.user) }, { email: String(options.user) }]
          },
          select: { id: true, email: true }
        })
        if (!user) {
          console.error(chalk.red(`User not found: ${options.user}`))
          process.exit(1)
        }
        userId = user.id
        console.log(chalk.gray(`Filtering by user: ${user.email} (${user.id})`))
      }

      const fitFiles = await prisma.fitFile.findMany({
        where: {
          ...(options.fitfileId ? { id: String(options.fitfileId) } : {}),
          ...(userId ? { userId } : {}),
          workoutId: { not: null }
        },
        include: {
          workout: {
            select: {
              id: true,
              source: true,
              title: true,
              streams: { select: { id: true, extrasMeta: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: options.fitfileId ? 1 : limit
      })

      if (fitFiles.length === 0) {
        console.log(chalk.yellow('No matching FitFiles found.'))
        return
      }

      console.log(chalk.gray(`Found ${fitFiles.length} FitFile records to evaluate.`))

      let scanned = 0
      let updated = 0
      let skipped = 0
      let failed = 0

      for (const fitFile of fitFiles) {
        scanned++
        const workoutId = fitFile.workoutId
        const hasExtrasMeta = !!fitFile.workout?.streams?.extrasMeta

        if (!workoutId) {
          skipped++
          continue
        }

        if (!includeAll && hasExtrasMeta) {
          skipped++
          continue
        }

        try {
          const fitData = await parseFitFile(Buffer.from(fitFile.fileData))
          const extrasMeta = extractFitExtrasMeta(fitData)

          if (isDryRun) {
            console.log(
              chalk.green(
                `[DRY RUN] Would upsert extrasMeta for workout ${workoutId} from FitFile ${fitFile.id}`
              )
            )
          } else {
            await prisma.workoutStream.upsert({
              where: { workoutId },
              create: { workoutId, extrasMeta },
              update: { extrasMeta }
            })
            if (updated % 25 === 0) process.stdout.write('.')
          }

          updated++
        } catch (error: any) {
          failed++
          console.error(
            chalk.red(
              `\nFailed FitFile ${fitFile.id} (workout ${workoutId}): ${error?.message || error}`
            )
          )
        }
      }

      console.log('\n')
      console.log(chalk.bold('Summary:'))
      console.log(`Scanned: ${scanned}`)
      console.log(`Updated: ${updated}`)
      console.log(`Skipped: ${skipped}`)
      console.log(`Failed:  ${failed}`)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillFitExtrasMetaCommand
