import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import { sportSettingsRepository } from '../../server/utils/repositories/sportSettingsRepository'
import { buildWorkoutAnalysisFacts } from '../../server/utils/workout-analysis-facts'

function extractWorkoutId(input?: string) {
  if (!input) return null
  const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return uuidMatch ? uuidMatch[0] : null
}

function printSection(title: string, payload: Record<string, unknown>) {
  console.log(chalk.bold.cyan(`\n${title}`))
  for (const [key, value] of Object.entries(payload)) {
    const formatted = Array.isArray(value) ? value.join(', ') : String(value)
    console.log(`${chalk.gray(`${key}:`).padEnd(28)} ${formatted}`)
  }
}

const workoutFactsCommand = new Command('workout-facts')
  .description('Compute and print workout analysis facts for debugging')
  .argument('[url]', 'Optional Coach Wattz workout URL or UUID')
  .option('--id <workoutId>', 'Workout UUID')
  .option('--prod', 'Use production database')
  .option('--json', 'Print raw JSON payload')
  .action(async (url: string | undefined, options) => {
    const workoutId = options.id || extractWorkoutId(url)
    const isProd = Boolean(options.prod || (url && url.includes('coachwatts.com')))

    if (!workoutId) {
      console.error(chalk.red('Workout ID is required. Pass --id <uuid> or a workout URL.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(
        chalk[isProd ? 'yellow' : 'blue'](
          isProd ? 'Using PRODUCTION database.' : 'Using DEVELOPMENT database.'
        )
      )

      const workout = await prisma.workout.findUnique({
        where: { id: workoutId },
        include: {
          streams: true,
          plannedWorkout: true,
          exercises: {
            include: {
              exercise: true,
              sets: {
                orderBy: {
                  order: 'asc'
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      })

      if (!workout) {
        throw new Error(`Workout not found: ${workoutId}`)
      }

      const [sportSettings, userProfile] = await Promise.all([
        sportSettingsRepository.getForActivityType(workout.userId, workout.type || '', prisma),
        prisma.user.findUnique({
          where: { id: workout.userId },
          select: {
            weight: true,
            weightUnits: true,
            language: true
          }
        })
      ])

      const facts = buildWorkoutAnalysisFacts({
        workout,
        sportSettings,
        plannedWorkout: workout.plannedWorkout,
        userProfile
      })

      if (options.json) {
        console.log(JSON.stringify(facts, null, 2))
        return
      }

      console.log(chalk.bold(`\nWorkout Analysis Facts`))
      console.log(`${chalk.gray('Title:').padEnd(28)} ${workout.title}`)
      console.log(`${chalk.gray('Workout ID:').padEnd(28)} ${workout.id}`)
      console.log(`${chalk.gray('Type:').padEnd(28)} ${workout.type || 'Unknown'}`)

      printSection('Subjective', facts.subjective as unknown as Record<string, unknown>)
      printSection('Telemetry', facts.telemetry as unknown as Record<string, unknown>)
      printSection('Physiology', facts.physiology as unknown as Record<string, unknown>)
      printSection('L/R Balance', facts.lrBalance as unknown as Record<string, unknown>)
      printSection('ERG', facts.erg as unknown as Record<string, unknown>)
      printSection('Debug Meta', facts.debugMeta as unknown as Record<string, unknown>)
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default workoutFactsCommand
