import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import {
  getStartOfLocalDateUTC,
  getEndOfLocalDateUTC,
  formatDateUTC
} from '../../server/utils/date'

const calendarCommand = new Command('calendar')
  .description('Debug Calendar API logic for a user/date')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'User email (required if no ID provided)')
  .option('--id <userId>', 'User ID')
  .option('--start <date>', 'Start Date (YYYY-MM-DD)', 'today')
  .option('--end <date>', 'End Date (YYYY-MM-DD)', 'today')
  .option('--target <id>', 'Specific Activity/Workout ID to check')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      let userId = options.id
      if (!userId && options.user) {
        const user = await prisma.user.findUnique({ where: { email: options.user } })
        if (!user) {
          console.error(chalk.red(`User not found: ${options.user}`))
          return
        }
        userId = user.id
        console.log(chalk.green(`Found User: ${user.email} (${user.id})`))
        console.log(`Timezone: ${user.timezone}`)
      } else if (!userId) {
        // If target is provided, try to find user from it
        if (options.target) {
          const pw = await prisma.plannedWorkout.findUnique({
            where: { id: options.target },
            select: { userId: true }
          })
          if (pw) userId = pw.userId
          else {
            const w = await prisma.workout.findUnique({
              where: { id: options.target },
              select: { userId: true }
            })
            if (w) userId = w.userId
          }
          if (userId) console.log(chalk.green(`Inferred User ID from Target: ${userId}`))
        }
      }

      if (!userId) {
        console.error(chalk.red('User ID or Email is required.'))
        return
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        console.error(chalk.red('User not found'))
        return
      }

      const timezone = user.timezone || 'UTC'

      // Parse Dates
      let startDateStr = options.start
      let endDateStr = options.end

      if (startDateStr === 'today') startDateStr = new Date().toISOString().split('T')[0]
      if (endDateStr === 'today') endDateStr = new Date().toISOString().split('T')[0]

      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)

      const rangeStart = getStartOfLocalDateUTC(timezone, formatDateUTC(startDate, 'yyyy-MM-dd'))
      const rangeEnd = getEndOfLocalDateUTC(timezone, formatDateUTC(endDate, 'yyyy-MM-dd'))

      console.log(chalk.cyan('\n=== Calendar Range ==='))
      console.log(`Input: ${startDateStr} to ${endDateStr}`)
      console.log(`Timezone: ${timezone}`)
      console.log(`UTC Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`)

      // Fetch Workouts
      console.log(chalk.cyan('\n=== Fetching Workouts (Completed) ==='))
      const workouts = await prisma.workout.findMany({
        where: {
          userId,
          date: {
            gte: rangeStart,
            lte: rangeEnd
          }
        },
        include: { plannedWorkout: true }
      })
      console.log(`Found ${workouts.length} completed workouts.`)
      workouts.forEach((w) => {
        console.log(
          `- [${formatDateUTC(w.date)}] ${w.title} (ID: ${w.id}) -> Linked Plan: ${w.plannedWorkoutId || 'None'}`
        )
      })

      // Fetch Planned
      console.log(chalk.cyan('\n=== Fetching Planned Workouts ==='))
      const plannedWorkouts = await prisma.plannedWorkout.findMany({
        where: {
          userId,
          date: {
            gte: rangeStart,
            lte: rangeEnd
          }
        }
      })
      console.log(`Found ${plannedWorkouts.length} planned workouts.`)

      const completedPlannedIds = new Set(workouts.map((w) => w.plannedWorkoutId).filter(Boolean))

      plannedWorkouts.forEach((p) => {
        const isLinked = completedPlannedIds.has(p.id)
        const status = isLinked ? chalk.gray('HIDDEN (Linked)') : chalk.green('VISIBLE')
        console.log(`- [${formatDateUTC(p.date)}] ${p.title} (ID: ${p.id}) -> ${status}`)

        if (options.target && p.id === options.target) {
          const apiObject = {
            id: p.id,
            title: p.title,
            date: p.date.toISOString(),
            type: p.type || 'Workout',
            source: 'planned',
            status: 'planned', // Simplified
            duration: p.durationSec || 0,
            distance: p.distanceMeters,
            tss: p.tss,
            intensity: p.workIntensity,
            plannedDuration: p.durationSec,
            plannedDistance: p.distanceMeters,
            plannedTss: p.tss,
            structuredWorkout: p.structuredWorkout
          }
          console.log(chalk.yellow('\nSimulated API Response Object:'))
          console.dir(apiObject, { depth: null, colors: true })
        }
      })

      if (options.target) {
        console.log(chalk.cyan(`\n=== Checking Target ID: ${options.target} ===`))
        const pTarget = await prisma.plannedWorkout.findUnique({ where: { id: options.target } })
        if (pTarget) {
          console.log(chalk.green('Found in PlannedWorkout table.'))
          console.log(`Date: ${pTarget.date.toISOString()}`)
          console.log(
            `User ID matches? ${pTarget.userId === userId ? 'Yes' : 'No (' + pTarget.userId + ')'}`
          )

          const inRange = pTarget.date >= rangeStart && pTarget.date <= rangeEnd
          console.log(`In Query Range? ${inRange ? chalk.green('Yes') : chalk.red('No')}`)

          const isLinked = completedPlannedIds.has(pTarget.id)
          console.log(
            `Is Linked to Completed? ${isLinked ? chalk.red('Yes (Should be hidden)') : chalk.green('No')}`
          )

          if (!inRange) {
            console.log(
              chalk.yellow(
                'Hint: Try expanding the date range. The calendar might be requesting a different range than you expect.'
              )
            )
          }
        } else {
          console.log(chalk.red('Not found in PlannedWorkout table.'))
        }
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
    }
  })

export default calendarCommand
