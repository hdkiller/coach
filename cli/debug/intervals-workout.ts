import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
// @ts-expect-error: workout-converter lacks types in this context
import { WorkoutConverter } from '../../server/utils/workout-converter'

const intervalsWorkoutCommand = new Command('intervals-workout')
  .description('Debug a planned workout and its Intervals.icu payload')
  .argument('<id>', 'Planned Workout ID')
  .option('--prod', 'Use production database')
  .option('--sync', 'Actually try to sync/update on Intervals.icu')
  .action(async (id, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (isProd) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
    }

    if (isProd) {
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const { updateIntervalsPlannedWorkout, createIntervalsPlannedWorkout } =
        await import('../../server/utils/intervals')

      console.log(chalk.blue(`Fetching planned workout ${id}...`))

      const workout = await prisma.plannedWorkout.findUnique({
        where: { id },
        include: { user: true }
      })

      if (!workout) {
        console.error(chalk.red('Planned workout not found'))
        return
      }

      console.log(chalk.green('✓ Found Planned Workout:'), workout.title)
      console.log(`- Date: ${workout.date.toISOString().split('T')[0]}`)
      console.log(`- Type: ${workout.type}`)
      console.log(`- External ID: ${workout.externalId || chalk.gray('None')}`)
      console.log(`- Sync Status: ${workout.syncStatus || chalk.gray('None')}`)
      console.log(`- Last Sync: ${workout.lastSyncedAt?.toISOString() || chalk.gray('Never')}`)

      // Get Intervals integration
      const integration = await prisma.integration.findFirst({
        where: {
          userId: workout.userId,
          provider: 'intervals'
        }
      })

      if (!integration) {
        console.error(chalk.red('Intervals integration not found for this user'))
        return
      }

      console.log(chalk.green('✓ Found Intervals Integration'))
      console.log(`- Athlete ID: ${integration.externalUserId}`)

      // Build the workout text (Intervals.icu "workout_doc" format or descriptive text)
      console.log(chalk.bold('\n--- Payload Preview ---'))

      const structuredWorkout = workout.structuredWorkout as any
      let workoutText = ''
      if (structuredWorkout) {
        try {
          // We need to pass the full WorkoutData object
          workoutText = WorkoutConverter.toIntervalsICU({
            title: workout.title,
            description: workout.description || '',
            type: workout.type,
            steps: structuredWorkout.steps || [],
            exercises: structuredWorkout.exercises || []
          })
        } catch (e) {
          console.warn(chalk.yellow('Could not build structured text:'), e)
          workoutText = workout.description || ''
        }
      } else {
        workoutText = workout.description || ''
      }

      const year = workout.date.getUTCFullYear()
      const month = String(workout.date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(workout.date.getUTCDate()).padStart(2, '0')
      const timeStr = workout.startTime ? `${workout.startTime}:00` : '06:00:00'
      const dateStr = `${year}-${month}-${day}T${timeStr}`

      const workoutPayload: any = {
        id: workout.id,
        externalId: workout.externalId,
        date: workout.date,
        startTime: workout.startTime,
        title: workout.title,
        description: workout.description,
        type: workout.type,
        durationSec: workout.durationSec,
        tss: workout.tss,
        workout_doc: workoutText,
        managedBy: workout.managedBy
      }

      const intervalsPayload: any = {
        start_date_local: dateStr,
        name: workout.title,
        description: workoutText,
        category: 'WORKOUT',
        type: workout.type === 'Gym' ? 'WeightTraining' : workout.type
      }

      if (workout.durationSec) {
        intervalsPayload.duration = workout.durationSec
      }
      if (workout.tss) {
        intervalsPayload.tss = workout.tss
      }

      console.log(JSON.stringify(intervalsPayload, null, 2))

      console.log(chalk.bold('\n--- Formatted Workout Text (Copy-paste to Intervals.icu) ---'))
      console.log(chalk.gray('-----------------------------------------------------------'))
      console.log(workoutText)
      console.log(chalk.gray('-----------------------------------------------------------'))

      if (options.sync) {
        console.log(chalk.blue('\nAttempting sync...'))

        const isLocal =
          workout.syncStatus === 'LOCAL_ONLY' ||
          workout.externalId.startsWith('ai_gen_') ||
          workout.externalId.startsWith('ai-gen-') ||
          workout.externalId.startsWith('adhoc-')

        let result: any
        try {
          if (isLocal) {
            result = await createIntervalsPlannedWorkout(integration, workoutPayload)
          } else {
            result = await updateIntervalsPlannedWorkout(
              integration,
              workout.externalId,
              workoutPayload
            )
          }

          console.log(chalk.green('✓ Sync Successful'))
          if (result) {
            console.log('Intervals ID:', result.id)
          }

          // Update the record in the DB we are connected to
          await prisma.plannedWorkout.update({
            where: { id: workout.id },
            data: {
              syncStatus: 'SYNCED',
              lastSyncedAt: new Date(),
              syncError: null,
              ...(isLocal && result?.id && { externalId: String(result.id) })
            }
          })
          console.log(chalk.blue('Updated database sync status.'))
        } catch (syncError: any) {
          console.log(chalk.red('❌ Sync Failed'))
          console.log('Error:', syncError.message)
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      if (error.stack) console.error(error.stack)
    } finally {
      await prisma.$disconnect()
    }
  })

export default intervalsWorkoutCommand
