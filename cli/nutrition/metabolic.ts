import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { calculateEnergyTimeline } from '../../server/utils/nutrition-domain'

function formatDateUTC(date: Date): string {
  return format(date, 'yyyy-MM-dd', { timeZone: 'UTC' })
}

function getDayRangeUTC(timezone: string, date: Date) {
  const zonedDate = toZonedTime(date, timezone)
  const rangeStart = fromZonedTime(startOfDay(zonedDate), timezone)
  const rangeEnd = fromZonedTime(endOfDay(zonedDate), timezone)
  return { rangeStart, rangeEnd }
}

const metabolicCommand = new Command('metabolic')
  .description('Debug the metabolic engine for a user and date')
  .argument('<email_or_id>', 'User email or ID')
  .argument('[date]', 'Date to analyze (YYYY-MM-DD), defaults to today')
  .option('--prod', 'Use production database')
  .action(async (emailOrId, dateStr, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    console.log(chalk[isProd ? 'yellow' : 'blue'](`Using ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} database.`))

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: emailOrId }, { id: emailOrId }]
        }
      })

      if (!user) {
        console.error(chalk.red(`User ${emailOrId} not found`))
        return
      }

      const timezone = user.timezone || 'UTC'
      const targetDate = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date()
      const targetDateKey = dateStr || format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd')
      const targetDateUtc = new Date(`${targetDateKey}T00:00:00Z`)

      const yesterdayUtc = new Date(targetDateUtc)
      yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1)

      const [settingsRecord, todayNutrition, yesterdayNutrition] = await Promise.all([
        prisma.userNutritionSettings.findUnique({ where: { userId: user.id } }),
        prisma.nutrition.findFirst({ where: { userId: user.id, date: targetDateUtc } }),
        prisma.nutrition.findFirst({ where: { userId: user.id, date: yesterdayUtc } })
      ])

      const { rangeStart, rangeEnd } = getDayRangeUTC(timezone, targetDateUtc)

      const [completedWorkouts, plannedWorkouts] = await Promise.all([
        prisma.workout.findMany({
          where: {
            userId: user.id,
            isDuplicate: false,
            date: { gte: rangeStart, lte: rangeEnd }
          },
          orderBy: { date: 'asc' }
        }),
        prisma.plannedWorkout.findMany({
          where: {
            userId: user.id,
            date: { gte: rangeStart, lte: rangeEnd }
          },
          orderBy: { date: 'asc' }
        })
      ])

      const completedPlannedIds = new Set(
        completedWorkouts.map((w) => w.plannedWorkoutId).filter(Boolean)
      )
      const remainingPlanned = plannedWorkouts.filter(
        (p) => !p.completed && !completedPlannedIds.has(p.id)
      )
      const workoutsForSimulation = [...completedWorkouts, ...remainingPlanned]

      const settings = {
        ...settingsRecord,
        weight: user.weight || 75,
        user: { weight: user.weight || 75 }
      }

      const metabolicFloor = Number(settingsRecord?.metabolicFloor ?? 0.6)
      const startingGlycogen = Number(
        todayNutrition?.startingGlycogenPercentage ??
          yesterdayNutrition?.endingGlycogenPercentage ??
          metabolicFloor * 100
      )
      const startingFluid = Number(
        todayNutrition?.startingFluidDeficit ?? yesterdayNutrition?.endingFluidDeficit ?? 0
      )

      const fallbackCarbsGoal = Number(settingsRecord?.fuelState1Min ?? 3) * (user.weight || 75)
      const nutritionForSimulation =
        todayNutrition ||
        ({
          date: targetDateUtc.toISOString(),
          carbsGoal: fallbackCarbsGoal
        } as any)

      console.log(
        chalk.bold.cyan(`
=== Metabolic Debug: ${user.email} (${formatDateUTC(targetDateUtc)}) ===`)
      )
      console.log(chalk.gray(`Timezone: ${timezone}`))
      console.log(chalk.yellow('\nStarting State:'))
      console.log(`- Glycogen: ${chalk.bold(startingGlycogen.toFixed(1))}%`)
      console.log(`- Fluid Deficit: ${chalk.bold(Math.round(startingFluid))}ml`)

      const points = calculateEnergyTimeline(
        nutritionForSimulation,
        workoutsForSimulation,
        settings,
        timezone,
        undefined,
        {
          startingGlycogenPercentage: startingGlycogen,
          startingFluidDeficit: startingFluid
        }
      )

      console.log(chalk.yellow('\nDetected Simulation Events:'))
      const eventTable = new Table({
        head: ['Time', 'Type', 'Name', 'Carbs', 'Fluid', 'Status'],
        colWidths: [10, 15, 40, 10, 10, 15]
      })

      const eventPoints = points.filter((p) => p.event)
      eventPoints.forEach((p) => {
        eventTable.push([
          p.time,
          p.eventType || 'N/A',
          p.event || 'N/A',
          p.eventCarbs !== undefined ? `${p.eventCarbs > 0 ? '+' : ''}${p.eventCarbs}g` : '-',
          p.eventFluid !== undefined ? `${p.eventFluid}ml` : '-',
          p.isFuture ? 'Future' : 'Past'
        ])
      })

      if (eventPoints.length === 0) {
        console.log(chalk.gray('No specific meal/workout events detected in timeline.'))
      } else {
        console.log(eventTable.toString())
      }

      console.log(chalk.yellow('\nMetabolic Wave (Hourly Samples):'))
      const waveTable = new Table({
        head: ['Time', 'Tank (%)', 'Carb Bal (g)', 'Fluid Def (ml)'],
        colWidths: [10, 15, 15, 15]
      })

      for (let i = 0; i < points.length; i += 4) {
        const p = points[i]!
        let color = chalk.green
        if (p.level < 50) color = chalk.yellow
        if (p.level < 25) color = chalk.red

        waveTable.push([
          p.time,
          color(`${p.level}%`),
          `${p.carbBalance > 0 ? '+' : ''}${p.carbBalance}g`,
          `${p.fluidDeficit}ml`
        ])
      }
      console.log(waveTable.toString())

      const minPoint = points.reduce((prev, curr) => (prev.level < curr.level ? prev : curr))
      const maxPoint = points.reduce((prev, curr) => (prev.level > curr.level ? prev : curr))

      console.log(chalk.yellow('\nDaily Summary:'))
      console.log(`- Peak Energy: ${chalk.bold(maxPoint.level)}% at ${maxPoint.time}`)
      console.log(
        `- Min Energy: ${minPoint.level < 25 ? chalk.red.bold(minPoint.level) : chalk.bold(minPoint.level)}% at ${minPoint.time}`
      )

      if (minPoint.level < 20) {
        console.log(chalk.red.bold(`\n⚠️  WARNING: Potential Bonk Detected at ${minPoint.time}!`))
      }
    } catch (err) {
      console.error(chalk.red('Error:'), err)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default metabolicCommand
