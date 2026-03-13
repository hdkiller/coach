import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import { sportSettingsRepository } from '../../server/utils/repositories/sportSettingsRepository'
import {
  buildWorkoutAnalysisFacts,
  buildWorkoutAnalysisFactsV2
} from '../../server/utils/workout-analysis-facts'

function extractWorkoutId(input?: string) {
  if (!input) return null
  const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return uuidMatch ? uuidMatch[0] : null
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (Array.isArray(value)) return value.map((entry) => formatScalar(entry)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function printEntries(payload: Record<string, unknown>, prefix = '') {
  for (const [key, value] of Object.entries(payload)) {
    const label = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      printEntries(value as Record<string, unknown>, label)
      continue
    }

    const formatted = formatScalar(value)
    console.log(`${chalk.gray(`${label}:`).padEnd(40)} ${formatted}`)
  }
}

function printSection(title: string, payload: Record<string, unknown>) {
  console.log(chalk.bold.cyan(`\n${title}`))
  printEntries(payload)
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
      const factsV2 = buildWorkoutAnalysisFactsV2({
        workout,
        sportSettings,
        plannedWorkout: workout.plannedWorkout,
        userProfile
      })

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              v1: facts,
              v2: factsV2
            },
            null,
            2
          )
        )
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

      printSection('Guardrails v2', factsV2.guardrails as unknown as Record<string, unknown>)
      printSection('Adherence v2', factsV2.adherence as unknown as Record<string, unknown>)
      printSection(
        'Performance Signals v2',
        factsV2.performanceSignals as unknown as Record<string, unknown>
      )
      printSection('Confidence v2', factsV2.confidence as unknown as Record<string, unknown>)
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default workoutFactsCommand
