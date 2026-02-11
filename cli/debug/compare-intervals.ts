import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const compareIntervalsCommand = new Command('compare-intervals')
  .description('Compare a planned workout with its Intervals.icu counterpart')
  .argument('<workoutId>', 'Internal Planned Workout ID')
  .option('--prod', 'Use production database')
  .action(async (workoutId, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.blue(`Fetching workout ${workoutId}...`))
      const workout = await prisma.plannedWorkout.findUnique({
        where: { id: workoutId },
        include: { user: true }
      })

      if (!workout) {
        console.error(chalk.red('Workout not found'))
        return
      }

      if (!workout.externalId) {
        console.error(chalk.red('Workout does not have an externalId'))
        return
      }

      console.log(chalk.blue(`Found workout. External ID: ${workout.externalId}`))

      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: workout.userId,
            provider: 'intervals'
          }
        }
      })

      if (!integration) {
        console.error(chalk.red('Intervals integration not found'))
        return
      }

      // Fetch from Intervals
      // Use '0' for OAuth as per our service logic
      const athleteId =
        integration.scope || integration.refreshToken ? '0' : integration.externalUserId || 'i0'
      const token = integration.accessToken
      const auth =
        integration.scope || integration.refreshToken
          ? `Bearer ${token}`
          : `Basic ${Buffer.from(`API_KEY:${token}`).toString('base64')}`

      const url = `https://intervals.icu/api/v1/athlete/${athleteId}/events/${workout.externalId}`
      console.log(chalk.blue(`Fetching from Intervals.icu: ${url}`))

      const response = await fetch(url, {
        headers: { Authorization: auth }
      })

      if (!response.ok) {
        console.error(
          chalk.red(`Failed to fetch from Intervals: ${response.status} ${response.statusText}`)
        )
        const text = await response.text()
        console.error(text)
        return
      }

      const remote = await response.json()

      console.log(chalk.bold('\n--- COMPARISON ---\n'))

      // Compare Description
      console.log(chalk.bold('Description:'))
      console.log(chalk.dim('Local:'))
      console.log(workout.description || chalk.gray('(empty)'))
      console.log(chalk.dim('\nRemote:'))
      console.log(remote.description || chalk.gray('(empty)'))

      // Compare Duration
      console.log(chalk.bold('\nDuration:'))
      console.log(`Local (durationSec): ${workout.durationSec}`)
      console.log(`Remote (duration):   ${remote.duration}`)
      if (workout.durationSec !== remote.duration) {
        console.log(chalk.yellow('⚠ Duration mismatch!'))
      } else {
        console.log(chalk.green('✓ Duration matches'))
      }

      console.log(chalk.bold('\nRaw Structured Data:'))
      console.log(chalk.dim('Local (structuredWorkout):'))
      console.log(JSON.stringify(workout.structuredWorkout, null, 2))
      console.log(chalk.dim('\nRemote (workout_doc):'))
      console.log(JSON.stringify(remote.workout_doc, null, 2))

      // Compare Structured Steps
      console.log(chalk.bold('\nSteps:'))
      const localSteps = (workout.structuredWorkout as any)?.steps || []
      const remoteSteps = remote.workout_doc?.steps || []

      console.log(`Local steps:  ${localSteps.length}`)
      console.log(`Remote steps: ${remoteSteps.length}`)

      if (localSteps.length !== remoteSteps.length) {
        console.log(chalk.red('Mismatch in step count!'))
      }

      console.log(chalk.bold('\nStep Details (First 3):'))
      for (let i = 0; i < Math.min(3, Math.max(localSteps.length, remoteSteps.length)); i++) {
        const local = localSteps[i] || {}
        const remoteStep = remoteSteps[i] || {}

        console.log(`\nStep ${i + 1}:`)
        console.log(
          `  Local Duration (sec):  ${local.durationSeconds} ${local.durationSeconds ? '(OK)' : chalk.red('(MISSING)')}`
        )
        console.log(`  Remote Duration:       ${remoteStep.duration}`)

        console.log(`  Local Power:     ${JSON.stringify(local.power)}`)
        console.log(`  Remote Power:    ${JSON.stringify(remoteStep.power)}`)

        console.log(`  Local Cadence:   ${JSON.stringify(local.cadence)}`)
        console.log(`  Remote Cadence:  ${JSON.stringify(remoteStep.cadence)}`)

        console.log(`  Local Name:      "${local.name}"`)
        console.log(`  Remote Text:     "${remoteStep.text}"`)

        console.log(`  Local Type:      "${local.type}"`)
        console.log(
          `  Remote Flags:    warmup=${remoteStep.warmup}, cooldown=${remoteStep.cooldown}`
        )
      }

      // Check for normalization global status
      const isNormalizedDuration = localSteps.every((s: any) => s.durationSeconds !== undefined)
      if (isNormalizedDuration) {
        console.log(chalk.green('\n✓ Local duration normalized (durationSeconds present)'))
      } else {
        console.log(
          chalk.red('\n❌ Local duration NOT normalized (durationSeconds missing in some steps)')
        )
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
    } finally {
      await prisma.$disconnect()
    }
  })

export default compareIntervalsCommand
