import 'dotenv/config'
import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { refreshGarminToken } from '../../server/utils/garmin'
import { countStepsInGarminWorkoutResponse } from '../../server/utils/garmin-push'

function summarizeSteps(steps: any[], depth = 0): any[] {
  return (steps || []).map((s) => ({
    depth,
    type: s.type,
    stepOrder: s.stepOrder,
    intensity: s.intensity,
    durationType: s.durationType,
    durationValue: s.durationValue,
    targetType: s.targetType,
    targetValueLow: s.targetValueLow,
    targetValueHigh: s.targetValueHigh,
    secondaryTargetType: s.secondaryTargetType,
    secondaryTargetValue: s.secondaryTargetValue,
    repeatType: s.repeatType,
    repeatValue: s.repeatValue,
    description: s.description,
    children: Array.isArray(s.steps) ? summarizeSteps(s.steps, depth + 1) : undefined
  }))
}

const garminTrainingInspectCommand = new Command('garmin-training-inspect')
  .description('Inspect a Garmin Training API workout using a user integration token')
  .argument('<userIdentifier>', 'User ID or email')
  .option('--prod', 'Use production database')
  .option('--workout-id <id>', 'Garmin workout id to fetch')
  .option('--schedule-id <id>', 'Garmin schedule id to fetch')
  .option('--list', 'List recent Training API workouts instead of fetching one')
  .option('--raw', 'Print the full JSON response')
  .action(async (userIdentifier, options) => {
    const isProd = Boolean(options.prod)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD'))
      process.exit(1)
    }

    if (isProd) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
    ;(globalThis as any).prismaGlobalV2 = prisma

    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userIdentifier }, { email: userIdentifier }] }
      })
      if (!user) {
        console.error(chalk.red('User not found'))
        process.exit(1)
      }

      let integration = await prisma.integration.findFirst({
        where: { userId: user.id, provider: 'garmin' }
      })
      if (!integration) {
        console.error(chalk.red('Garmin integration not found'))
        process.exit(1)
      }

      console.log(
        chalk.green('✓'),
        user.email,
        `| externalUserId=${integration.externalUserId}`,
        `| scope=${integration.scope}`,
        `| expiresAt=${integration.expiresAt?.toISOString()}`
      )

      const expiresAtMs = integration.expiresAt?.getTime() || 0
      const needsRefresh = !expiresAtMs || Date.now() >= expiresAtMs - 5 * 60 * 1000
      if (needsRefresh) {
        console.log(chalk.blue('Refreshing Garmin access token...'))
        integration = await refreshGarminToken(integration)
        console.log(chalk.green('✓ Token refreshed'))
      } else {
        console.log(chalk.green('✓ Access token still valid (skipping refresh)'))
      }
      if (options.list) {
        const res = await fetch('https://apis.garmin.com/training-api/workout/v2', {
          headers: { Authorization: `Bearer ${integration.accessToken}` }
        })
        const text = await res.text()
        console.log(chalk.cyan(`LIST status ${res.status}`))
        console.log(text.slice(0, 4000))
        return
      }

      if (options.scheduleId) {
        const res = await fetch(
          `https://apis.garmin.com/training-api/schedule/${options.scheduleId}`,
          {
            headers: { Authorization: `Bearer ${integration.accessToken}` }
          }
        )
        const text = await res.text()
        console.log(chalk.cyan(`GET /training-api/schedule/${options.scheduleId} → ${res.status}`))
        console.log(text.slice(0, 4000))
        return
      }

      const workoutId = options.workoutId
      if (!workoutId) {
        console.error(chalk.red('Provide --workout-id <id>, --schedule-id <id>, or --list'))
        process.exit(1)
      }

      const res = await fetch(`https://apis.garmin.com/training-api/workout/v2/${workoutId}`, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })
      const text = await res.text()
      console.log(chalk.cyan(`GET /training-api/workout/v2/${workoutId} → ${res.status}`))
      if (!res.ok) {
        console.error(text.slice(0, 2000))
        process.exit(1)
      }

      if (options.raw) {
        console.log(text)
        return
      }

      const workout = JSON.parse(text)
      console.log(
        JSON.stringify(
          {
            workoutId: workout.workoutId ?? workout.id,
            ownerId: workout.ownerId,
            workoutName: workout.workoutName,
            sport: workout.sport,
            workoutProvider: workout.workoutProvider,
            segmentCount: Array.isArray(workout.segments) ? workout.segments.length : 0,
            topLevelStepCount: Array.isArray(workout.steps) ? workout.steps.length : 0,
            leafStepCount: countStepsInGarminWorkoutResponse(workout),
            segments: (workout.segments || []).map((seg: any) => ({
              segmentOrder: seg.segmentOrder,
              sport: seg.sport,
              stepCount: Array.isArray(seg.steps) ? seg.steps.length : 0,
              steps: summarizeSteps(seg.steps || [])
            })),
            topLevelSteps: summarizeSteps(workout.steps || [])
          },
          null,
          2
        )
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default garminTrainingInspectCommand
