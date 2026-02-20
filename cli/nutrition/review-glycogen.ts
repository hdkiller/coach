import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { subDays } from 'date-fns'
import { calculateEnergyTimeline } from '../../server/utils/nutrition-domain'

function toDateKey(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), 'yyyy-MM-dd')
}

function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`)
}

function getDayBoundsUtc(dateKey: string, timezone: string) {
  const start = fromZonedTime(`${dateKey}T00:00:00`, timezone)
  const end = fromZonedTime(`${dateKey}T23:59:59.999`, timezone)
  return { start, end }
}

function asItemArray(value: unknown): Array<{ logged_at?: string }> {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'object' && item !== null) as Array<{
    logged_at?: string
  }>
}

function getConfidenceLabel(params: {
  itemCount: number
  timestampedItemCount: number
  workoutCount: number
  qualityWorkoutCount: number
  chainStart: number | null
  previousEnd: number | null
}): 'LOW' | 'MEDIUM' | 'HIGH' {
  let score = 0

  if (params.itemCount > 0) {
    const ratio = params.timestampedItemCount / params.itemCount
    if (ratio >= 0.8) score += 1
    else if (ratio >= 0.5) score += 0.5
  }

  if (params.workoutCount === 0) {
    score += 1
  } else {
    const ratio = params.qualityWorkoutCount / params.workoutCount
    if (ratio >= 0.7) score += 1
    else if (ratio >= 0.4) score += 0.5
  }

  if (params.chainStart !== null && params.previousEnd !== null) {
    const diff = Math.abs(params.chainStart - params.previousEnd)
    if (diff <= 5) score += 1
    else score += 0.5
  } else if (params.chainStart !== null || params.previousEnd !== null) {
    score += 0.5
  }

  if (score >= 2.5) return 'HIGH'
  if (score >= 1.5) return 'MEDIUM'
  return 'LOW'
}

const reviewGlycogenCommand = new Command('review-glycogen')
  .description('Review recent nutrition/workouts and estimate glycogen trajectory for a user')
  .requiredOption('--user <query>', 'User ID/email/name query')
  .option('--days <number>', 'Number of days to include (default: 3)', '3')
  .option('--end-date <yyyy-mm-dd>', 'Last date to include (defaults to today in user timezone)')
  .option('--prod', 'Use production database')
  .option('--json', 'Print output as JSON')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const asJson = Boolean(options.json)
    const days = Math.max(1, Number.parseInt(String(options.days ?? '3'), 10) || 3)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!asJson && isProd) {
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else if (!asJson) {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: options.user },
            { email: { contains: options.user, mode: 'insensitive' } },
            { name: { contains: options.user, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
          weight: true
        }
      })

      if (!user) {
        console.error(chalk.red(`User not found matching "${options.user}".`))
        process.exit(1)
      }

      const timezone = user.timezone || 'UTC'
      const endDateKey = options.endDate || toDateKey(new Date(), timezone)
      const endDateUtc = parseDateKey(endDateKey)

      if (Number.isNaN(endDateUtc.getTime())) {
        console.error(chalk.red(`Invalid --end-date "${options.endDate}". Use YYYY-MM-DD.`))
        process.exit(1)
      }

      const dateKeys: string[] = []
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = subDays(endDateUtc, i)
        dateKeys.push(format(d, 'yyyy-MM-dd', { timeZone: 'UTC' }))
      }

      const settings = await prisma.userNutritionSettings.findUnique({
        where: { userId: user.id }
      })

      const metabolicFloorPct = Number(settings?.metabolicFloor ?? 0.6) * 100
      const fallbackCarbsGoal = Number(settings?.fuelState1Min ?? 3) * (user.weight || 75)

      const rows: Array<{
        date: string
        calories: number
        carbs: number
        waterMl: number
        workoutCount: number
        workoutTitles: string[]
        glycogenStartPct: number
        glycogenMinPct: number
        glycogenEndPct: number
        confidence: 'LOW' | 'MEDIUM' | 'HIGH'
      }> = []

      let previousDayEnd: number | null = null
      let previousDayFluidEnd: number | null = null

      for (const dateKey of dateKeys) {
        const dayDateUtc = parseDateKey(dateKey)
        const nutrition = await prisma.nutrition.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: dayDateUtc
            }
          }
        })

        const { start, end } = getDayBoundsUtc(dateKey, timezone)
        const [completedWorkouts, plannedWorkouts] = await Promise.all([
          prisma.workout.findMany({
            where: {
              userId: user.id,
              isDuplicate: false,
              date: { gte: start, lte: end }
            },
            orderBy: { date: 'asc' }
          }),
          prisma.plannedWorkout.findMany({
            where: {
              userId: user.id,
              date: dayDateUtc
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
          })
        ])

        const completedPlannedIds = new Set(
          completedWorkouts.map((w) => w.plannedWorkoutId).filter(Boolean)
        )
        const remainingPlanned = plannedWorkouts.filter(
          (p) => !p.completed && !completedPlannedIds.has(p.id)
        )
        const workoutsForSimulation = [...completedWorkouts, ...remainingPlanned]
        const qualityWorkoutCount = workoutsForSimulation.filter((w) => {
          const durationMin = Number((w.duration || 0) / 60)
          const intensity = Number(w.workIntensity || 0)
          return durationMin > 0 && intensity > 0
        }).length

        const rawChainStart =
          nutrition?.startingGlycogenPercentage != null
            ? Number(nutrition.startingGlycogenPercentage)
            : null

        const dayStartPct = Number(rawChainStart ?? previousDayEnd ?? metabolicFloorPct)
        const dayStartFluid = Number(nutrition?.startingFluidDeficit ?? previousDayFluidEnd ?? 0)

        const nutritionForSimulation =
          nutrition ||
          ({
            date: dayDateUtc.toISOString(),
            carbsGoal: fallbackCarbsGoal
          } as any)

        const timeline = calculateEnergyTimeline(
          nutritionForSimulation,
          workoutsForSimulation,
          {
            ...settings,
            weight: user.weight || 75,
            user: { weight: user.weight || 75 }
          },
          timezone,
          undefined,
          {
            startingGlycogenPercentage: dayStartPct,
            startingFluidDeficit: dayStartFluid
          }
        )

        const minPct = timeline.length > 0 ? Math.min(...timeline.map((p) => p.level)) : dayStartPct
        const endPct = timeline.length > 0 ? timeline[timeline.length - 1]!.level : dayStartPct

        const breakfastItems = asItemArray(nutrition?.breakfast)
        const lunchItems = asItemArray(nutrition?.lunch)
        const dinnerItems = asItemArray(nutrition?.dinner)
        const snackItems = asItemArray(nutrition?.snacks)
        const allItems = [...breakfastItems, ...lunchItems, ...dinnerItems, ...snackItems]
        const timestampedItemCount = allItems.filter((i) => Boolean(i.logged_at)).length
        const confidence = getConfidenceLabel({
          itemCount: allItems.length,
          timestampedItemCount,
          workoutCount: workoutsForSimulation.length,
          qualityWorkoutCount,
          chainStart: rawChainStart,
          previousEnd: previousDayEnd
        })

        rows.push({
          date: dateKey,
          calories: Math.round(Number(nutrition?.calories || 0)),
          carbs: Math.round(Number(nutrition?.carbs || 0)),
          waterMl: Math.round(Number(nutrition?.waterMl || 0)),
          workoutCount: workoutsForSimulation.length,
          workoutTitles: workoutsForSimulation.map((w) => w.title || 'Untitled workout'),
          glycogenStartPct: Math.round(dayStartPct),
          glycogenMinPct: Math.round(minPct),
          glycogenEndPct: Math.round(endPct),
          confidence
        })

        previousDayEnd = Number(nutrition?.endingGlycogenPercentage ?? endPct)
        previousDayFluidEnd = Number(nutrition?.endingFluidDeficit ?? dayStartFluid)
      }

      if (asJson) {
        console.log(
          JSON.stringify(
            {
              environment: isProd ? 'production' : 'development',
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                timezone
              },
              range: {
                days,
                endDate: endDateKey
              },
              days: rows
            },
            null,
            2
          )
        )
        return
      }

      console.log(`\nUser: ${user.name || '(no name)'} (${user.email})`)
      console.log(`ID: ${user.id} | Timezone: ${timezone}`)
      console.log(`Range: last ${days} day(s), ending ${endDateKey}`)

      const table = new Table({
        head: [
          'Date',
          'Kcal',
          'Carbs(g)',
          'Water(ml)',
          'Workouts',
          'Start%',
          'Min%',
          'End%',
          'Confidence'
        ],
        colWidths: [12, 9, 10, 11, 9, 8, 8, 8, 12]
      })

      for (const row of rows) {
        table.push([
          row.date,
          row.calories,
          row.carbs,
          row.waterMl,
          row.workoutCount,
          row.glycogenStartPct,
          row.glycogenMinPct,
          row.glycogenEndPct,
          row.confidence
        ])
      }

      console.log('\n' + table.toString())

      for (const row of rows) {
        const workoutList = row.workoutTitles.length > 0 ? row.workoutTitles.join('; ') : 'None'
        console.log(`- ${row.date} workouts: ${workoutList}`)
      }
    } catch (error) {
      console.error(chalk.red('Error running review-glycogen:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default reviewGlycogenCommand
