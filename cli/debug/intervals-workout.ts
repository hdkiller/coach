import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
// @ts-expect-error: workout-converter lacks types in this context
import { WorkoutConverter } from '../../server/utils/workout-converter'

async function getSportSettingsForActivityType(
  prisma: PrismaClient,
  userId: string,
  activityType: string
) {
  const allSettings = await prisma.sportSettings.findMany({
    where: { userId },
    orderBy: { isDefault: 'desc' }
  })

  const specific = allSettings.find(
    (s: any) => !s.isDefault && Array.isArray(s.types) && s.types.includes(activityType)
  )
  if (specific) return specific

  const partial = allSettings.find(
    (s: any) =>
      !s.isDefault &&
      Array.isArray(s.types) &&
      s.types.some((t: string) => activityType.includes(t))
  )
  if (partial) return partial

  return allSettings.find((s: any) => s.isDefault) || null
}

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
      const {
        updateIntervalsPlannedWorkout,
        createIntervalsPlannedWorkout,
        cleanIntervalsDescription
      } = await import('../../server/utils/intervals')

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

      // Mirror publish endpoint type mapping.
      let intervalsType = workout.type || 'Ride'
      if (intervalsType === 'Active Recovery') {
        intervalsType = 'Ride'
      }

      const sportSettings = await getSportSettingsForActivityType(
        prisma,
        workout.userId,
        intervalsType
      )
      console.log(chalk.green('✓ Sport Settings Loaded'))
      console.log(
        `- Profile: ${sportSettings?.name || chalk.gray('Default/None')} (isDefault: ${sportSettings?.isDefault ? 'yes' : 'no'})`
      )
      console.log(`- loadPreference: ${sportSettings?.loadPreference || chalk.gray('None')}`)
      console.log(
        `- intervalsHrRangeTolerancePct: ${sportSettings?.intervalsHrRangeTolerancePct ?? chalk.gray('None')}`
      )

      const structuredWorkout = workout.structuredWorkout as any
      let workoutDoc = ''
      if (structuredWorkout) {
        try {
          workoutDoc = WorkoutConverter.toIntervalsICU({
            title: workout.title,
            description: workout.description || '',
            type: intervalsType,
            steps: structuredWorkout.steps || [],
            exercises: structuredWorkout.exercises || [],
            messages: structuredWorkout.messages || [],
            ftp: (workout.user as any).ftp || 250,
            sportSettings: sportSettings || undefined
          })
        } catch (e) {
          console.warn(chalk.yellow('Could not build structured text:'), e)
          workoutDoc = workout.description || ''
        }
      } else {
        workoutDoc = workout.description || ''
      }

      const cleanDescription = cleanIntervalsDescription(workout.description || '')

      const year = workout.date.getUTCFullYear()
      const month = String(workout.date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(workout.date.getUTCDate()).padStart(2, '0')
      const timeStr = workout.startTime ? `${workout.startTime}:00` : '06:00:00'
      const dateStr = `${year}-${month}-${day}T${timeStr}`

      const publishPayload: any = {
        id: workout.id,
        externalId: workout.externalId,
        date: workout.date,
        title: workout.title,
        description: cleanDescription,
        type: intervalsType,
        durationSec: workout.durationSec || 3600,
        tss: workout.tss ?? undefined,
        workout_doc: workoutDoc,
        managedBy: workout.managedBy
      }

      let combinedDescription = publishPayload.workout_doc || publishPayload.description || ''
      if (
        publishPayload.managedBy === 'COACH_WATTS' &&
        !combinedDescription.includes('[CoachWatts]')
      ) {
        combinedDescription = `${combinedDescription}\n\n[CoachWatts]`.trim()
      }

      const intervalsPayload: any = {
        start_date_local: dateStr,
        name: workout.title,
        description: combinedDescription,
        category: 'WORKOUT',
        type: publishPayload.type === 'Gym' ? 'WeightTraining' : publishPayload.type
      }

      if (!publishPayload.workout_doc) {
        if (publishPayload.durationSec) intervalsPayload.duration = publishPayload.durationSec
        if (publishPayload.tss) intervalsPayload.tss = publishPayload.tss
      } else if (publishPayload.tss) {
        intervalsPayload.tss = publishPayload.tss
      }

      console.log(chalk.bold('\n--- Publish Path Debug ---'))
      console.log(`- intervalsType: ${intervalsType}`)
      console.log(
        `- Clean base description: ${cleanDescription ? chalk.green('yes') : chalk.gray('empty')}`
      )
      console.log(`- workout_doc present: ${workoutDoc ? chalk.green('yes') : chalk.gray('no')}`)
      console.log(chalk.bold('\n--- Exact Intervals Request Body ---'))
      console.log(JSON.stringify(intervalsPayload, null, 2))

      console.log(chalk.bold('\n--- Formatted Workout Text (Copy-paste to Intervals.icu) ---'))
      console.log(chalk.gray('-----------------------------------------------------------'))
      console.log(workoutDoc)
      console.log(chalk.gray('-----------------------------------------------------------'))

      if (options.sync) {
        console.log(chalk.blue('\nAttempting sync...'))

        const isLocal =
          workout.syncStatus === 'LOCAL_ONLY' ||
          !workout.externalId ||
          workout.externalId.startsWith('ai_gen_') ||
          workout.externalId.startsWith('ai-gen-') ||
          workout.externalId.startsWith('adhoc-')

        let result: any
        try {
          if (isLocal) {
            result = await createIntervalsPlannedWorkout(integration, publishPayload)
          } else {
            result = await updateIntervalsPlannedWorkout(
              integration,
              workout.externalId,
              publishPayload
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
