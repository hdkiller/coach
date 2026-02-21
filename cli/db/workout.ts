import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export const workoutCommand = new Command('workout').description('Manage workout records')

const getPrisma = (isProd: boolean) => {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
  if (!connectionString) {
    console.error(chalk.red('Error: Database connection string is not defined.'))
    process.exit(1)
  }
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return { prisma: new PrismaClient({ adapter }), pool }
}

workoutCommand
  .command('get <id>')
  .description('Get details of a specific workout')
  .option('--prod', 'Use production database')
  .action(async (id, options) => {
    const { prisma, pool } = getPrisma(options.prod)
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      const workout = await prisma.workout.findUnique({
        where: { id },
        include: { user: { select: { email: true } } }
      })

      if (!workout) {
        console.log(chalk.red(`Workout ${id} not found.`))
        return
      }

      console.log(chalk.bold.blue('\n--- WORKOUT DETAILS ---'))
      console.log(chalk.bold('ID:'), workout.id)
      console.log(chalk.bold('User:'), workout.user.email)
      console.log(chalk.bold('Date:'), workout.date)
      console.log(chalk.bold('Title:'), workout.title)
      console.log(chalk.bold('Type:'), workout.type || 'N/A')
      console.log(chalk.bold('Status:'), workout.aiAnalysisStatus)
      console.log(chalk.bold('Duration:'), `${workout.durationSec}s`)
      console.log(
        chalk.bold('Distance:'),
        workout.distanceMeters ? `${workout.distanceMeters}m` : 'N/A'
      )
      console.log(chalk.bold('External ID:'), workout.externalId)
      console.log(chalk.bold('Source:'), workout.source)

      if (workout.aiAnalysis) {
        console.log(chalk.bold('\nAI Analysis:'))
        console.log(workout.aiAnalysis)
      }

      console.log(chalk.bold.blue('-----------------------\n'))
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

workoutCommand
  .command('list-recent')
  .description('List recently analyzed or stuck workouts')
  .option('--limit <number>', 'Limit the number of workouts shown', '10')
  .option(
    '--status <status>',
    'Filter by aiAnalysisStatus (e.g., IN_PROGRESS, FAILED, NOT_STARTED)'
  )
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const { prisma, pool } = getPrisma(options.prod)
    const limit = parseInt(options.limit)
    const status = options.status
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      const workouts = await prisma.workout.findMany({
        where: status ? { aiAnalysisStatus: status } : {},
        take: limit,
        orderBy: { date: 'desc' },
        include: { user: { select: { email: true } } }
      })

      if (workouts.length === 0) {
        console.log(chalk.yellow('No workouts found.'))
      } else {
        console.table(
          workouts.map((w) => ({
            ID: w.id,
            Status: w.aiAnalysisStatus,
            Title: w.title.length > 30 ? w.title.substring(0, 27) + '...' : w.title,
            User: w.user.email,
            Date: w.date.toISOString().split('T')[0]
          }))
        )
      }
    } catch (error) {
      console.error(chalk.red('Error fetching workouts:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })
