import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const historyCommand = new Command('history')
  .description('View the change history of a specific wellness record')
  .argument('<id>', 'Wellness record ID')
  .option('--prod', 'Use production database')
  .action(async (id, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(
          `Database connection string not found for ${isProd ? 'production' : 'development'}.`
        )
      )
      process.exit(1)
    }

    console.log(chalk.gray(`Connecting to ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} database...`))

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.gray(`Fetching wellness record ${id}...`))
      const wellness = await prisma.wellness.findUnique({
        where: { id },
        include: { user: true }
      })

      if (!wellness) {
        console.error(chalk.red(`Wellness record not found: ${id}`))
        process.exit(1)
      }

      console.log(chalk.bold.cyan(`\n=== Wellness Record History ===`))
      console.log(`ID:      ${chalk.white(wellness.id)}`)
      console.log(`Date:    ${chalk.white(wellness.date.toISOString().split('T')[0])}`)
      console.log(
        `User:    ${chalk.white(wellness.user.name || wellness.user.email)} (${wellness.userId})`
      )
      console.log(`Created: ${chalk.white(wellness.createdAt.toISOString())}`)
      console.log(`Updated: ${chalk.white(wellness.updatedAt.toISOString())}`)

      const history = (wellness.history as any[]) || []

      if (history.length === 0) {
        console.log(chalk.yellow('\nNo history entries found for this record.'))
        return
      }

      console.log(chalk.gray(`\nFound ${history.length} history entries:\n`))

      history.forEach((entry, index) => {
        const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown'
        const source = entry.source || 'Unknown'

        console.log(chalk.bold.yellow(`[${index + 1}] ${timestamp} | Source: ${source}`))

        if (entry.changes === 'created') {
          console.log(chalk.green('  Record created'))
        } else if (typeof entry.changes === 'object') {
          const changeEntries = Object.entries(entry.changes)
          if (changeEntries.length === 0) {
            console.log(chalk.gray('  No field changes tracked (likely metadata update)'))
          } else {
            changeEntries.forEach(([field, val]: [string, any]) => {
              const oldVal = val.old === null || val.old === undefined ? 'null' : String(val.old)
              const newVal = val.new === null || val.new === undefined ? 'null' : String(val.new)
              console.log(
                `  ${chalk.blue(field.padEnd(15))}: ${chalk.red(oldVal)} -> ${chalk.green(newVal)}`
              )
            })
          }
        } else {
          console.log(chalk.gray(`  Unknown change type: ${entry.changes}`))
        }
        console.log('')
      })
    } catch (e: any) {
      console.error(chalk.red('Error:'), e.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default historyCommand
