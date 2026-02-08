import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'
import { seed as llmAnalysisLevelSettingsSeed } from './seeds/llm-analysis-level-settings'
import { seed as reportTemplatesSeed } from './seeds/report-templates'

const seedCommand = new Command('seed')
  .description('Seed the database')
  .argument('[seedName]', 'Name of the seed to run')
  .option('-f, --force', 'Overwrite existing data', false)
  .option('--prod', 'Use production database')
  .action(async (seedName, options) => {
    const isProd = options.prod
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

    // Registry of seeds
    // To add a new seed:
    // 1. Create a file in ./seeds/
    // 2. Import its seed function here
    // 3. Add it to the seeds object below
    const seeds: Record<
      string,
      (prismaClient: any, options?: { force?: boolean }) => Promise<void>
    > = {
      'llm-analysis-level-settings': llmAnalysisLevelSettingsSeed,
      'report-templates': reportTemplatesSeed
    }

    try {
      if (seedName) {
        const seedFn = seeds[seedName]
        if (!seedFn) {
          console.error(chalk.red(`Error: Seed "${seedName}" not found.`))
          console.log(chalk.gray(`Available seeds: ${Object.keys(seeds).join(', ')}`))
          process.exitCode = 1
          return
        }
        console.log(chalk.blue(`🚀 Running seed: ${seedName}${options.force ? ' (FORCE)' : ''}...`))
        await seedFn(prisma, options)
        console.log(chalk.green(`✅ Seed "${seedName}" completed successfully.`))
      } else {
        console.log(
          chalk.blue(`🚀 Running all available seeds${options.force ? ' (FORCE)' : ''}...`)
        )
        for (const [name, seedFn] of Object.entries(seeds)) {
          console.log(chalk.cyan(`\n🔹 Running seed: ${name}`))
          await seedFn(prisma, options)
        }
        console.log(chalk.green('\n✅ All seeds completed successfully.'))
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Seed failed:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default seedCommand
