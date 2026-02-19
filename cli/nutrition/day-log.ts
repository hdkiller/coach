import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

type LoggedItem = {
  id?: string
  name?: string
  quantity?: string
  entryType?: string
  logged_at?: string
  calories?: number
  carbs?: number
  protein?: number
  fat?: number
  water_ml?: number
  waterMl?: number
  fluidMl?: number
  hydrationFactor?: number
  hydrationContributionMl?: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asItemArray(value: unknown): LoggedItem[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => isObject(item)) as LoggedItem[]
}

function dateOnly(value: Date): string {
  return value.toISOString().split('T')[0]
}

function looksLikeFluidUnitQuantity(quantity: string | null): boolean {
  if (!quantity) return false
  const normalized = quantity.toLowerCase().trim()
  return /\b\d+(?:\.\d+)?\s*(ml|l)\b/.test(normalized)
}

const dayLogCommand = new Command('day-log')
  .description('Show logged nutrition items for a single day in table format')
  .option('--nutrition-id <id>', 'Nutrition entry ID (exact)')
  .option('--user <query>', 'User ID/email/name query')
  .option('--date <yyyy-mm-dd>', 'Target date in YYYY-MM-DD (required with --user)')
  .option('--prod', 'Use production database')
  .option('--json', 'Print output as JSON')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const asJson = Boolean(options.json)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!asJson && isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else if (!asJson) {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    if (!options.nutritionId && !options.user) {
      console.error(
        chalk.red('Provide either --nutrition-id <id> or --user <query> --date <YYYY-MM-DD>.')
      )
      process.exit(1)
    }

    if (options.user && !options.date) {
      console.error(chalk.red('--date <YYYY-MM-DD> is required when using --user.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      let entry: {
        id: string
        userId: string
        date: Date
        calories: number | null
        carbs: number | null
        protein: number | null
        fat: number | null
        fiber: number | null
        sugar: number | null
        waterMl: number | null
        breakfast: unknown
        lunch: unknown
        dinner: unknown
        snacks: unknown
      } | null = null

      if (options.nutritionId) {
        entry = await prisma.nutrition.findUnique({
          where: { id: options.nutritionId },
          select: {
            id: true,
            userId: true,
            date: true,
            calories: true,
            carbs: true,
            protein: true,
            fat: true,
            fiber: true,
            sugar: true,
            waterMl: true,
            breakfast: true,
            lunch: true,
            dinner: true,
            snacks: true
          }
        })
      } else {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: options.user },
              { email: { contains: options.user, mode: 'insensitive' } },
              { name: { contains: options.user, mode: 'insensitive' } }
            ]
          },
          select: { id: true }
        })

        if (!user) {
          console.error(chalk.red(`User not found matching "${options.user}".`))
          process.exit(1)
        }

        const parsedDate = new Date(`${options.date}T00:00:00Z`)
        if (Number.isNaN(parsedDate.getTime())) {
          console.error(chalk.red(`Invalid date "${options.date}". Use YYYY-MM-DD.`))
          process.exit(1)
        }

        entry = await prisma.nutrition.findUnique({
          where: { userId_date: { userId: user.id, date: parsedDate } },
          select: {
            id: true,
            userId: true,
            date: true,
            calories: true,
            carbs: true,
            protein: true,
            fat: true,
            fiber: true,
            sugar: true,
            waterMl: true,
            breakfast: true,
            lunch: true,
            dinner: true,
            snacks: true
          }
        })
      }

      if (!entry) {
        console.log(chalk.yellow('No nutrition entry found for the given lookup.'))
        return
      }

      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: { id: true, email: true, name: true, timezone: true }
      })

      const meals = [
        ['breakfast', asItemArray(entry.breakfast)] as const,
        ['lunch', asItemArray(entry.lunch)] as const,
        ['dinner', asItemArray(entry.dinner)] as const,
        ['snacks', asItemArray(entry.snacks)] as const
      ]

      const rows = meals.flatMap(([mealType, items]) =>
        items.map((item, index) => ({
          Meal: mealType,
          '#': index + 1,
          Name: item.name || '(unnamed)',
          Quantity: item.quantity || '',
          Type: item.entryType || 'FOOD',
          'Logged At': item.logged_at ? new Date(item.logged_at).toISOString() : '',
          Calories: item.calories ?? '',
          Carbs: item.carbs ?? '',
          Protein: item.protein ?? '',
          Fat: item.fat ?? '',
          'Water (ml)': item.water_ml ?? item.waterMl ?? '',
          'Hydration (ml)': item.hydrationContributionMl ?? '',
          ID: item.id || ''
        }))
      )

      const jsonRows = meals.flatMap(([mealType, items]) =>
        items.map((item, index) => ({
          meal: mealType,
          index: index + 1,
          name: item.name || '(unnamed)',
          quantity: item.quantity || null,
          type: item.entryType || 'FOOD',
          loggedAt: item.logged_at ? new Date(item.logged_at).toISOString() : null,
          calories: item.calories ?? null,
          carbs: item.carbs ?? null,
          protein: item.protein ?? null,
          fat: item.fat ?? null,
          waterMl: item.water_ml ?? item.waterMl ?? null,
          fluidMl: item.fluidMl ?? null,
          hydrationFactor: item.hydrationFactor ?? null,
          hydrationContributionMl: item.hydrationContributionMl ?? null,
          id: item.id || null
        }))
      )

      const totalsFromItems = jsonRows.reduce(
        (acc, item) => {
          const calories = item.calories ?? 0
          const carbs = item.carbs ?? 0
          const protein = item.protein ?? 0
          const fat = item.fat ?? 0
          const waterMl = item.waterMl ?? 0
          const hydrationContributionMl = item.hydrationContributionMl ?? waterMl

          if (item.type === 'HYDRATION') {
            acc.hydrationEntryMl += hydrationContributionMl
          } else {
            acc.foodCalories += calories
            acc.foodCarbs += carbs
            acc.foodProtein += protein
            acc.foodFat += fat
          }

          acc.itemCalories += calories
          acc.itemCarbs += carbs
          acc.itemProtein += protein
          acc.itemFat += fat
          acc.itemWaterMl += waterMl
          acc.itemHydrationMl += hydrationContributionMl

          const looksLikeLiquidByQuantity = looksLikeFluidUnitQuantity(item.quantity)
          if (item.type !== 'HYDRATION' && looksLikeLiquidByQuantity) {
            acc.foodItemsWithFluidUnits += 1
          }

          return acc
        },
        {
          itemCalories: 0,
          itemCarbs: 0,
          itemProtein: 0,
          itemFat: 0,
          itemWaterMl: 0,
          itemHydrationMl: 0,
          hydrationEntryMl: 0,
          foodCalories: 0,
          foodCarbs: 0,
          foodProtein: 0,
          foodFat: 0,
          foodItemsWithFluidUnits: 0
        }
      )

      const mealLinkedBonusMlEstimate = Math.max(
        0,
        Math.round((entry.waterMl || 0) - totalsFromItems.itemWaterMl)
      )
      const fluidUnitFoodItems = jsonRows.filter((item) => {
        const looksLikeLiquidByQuantity = looksLikeFluidUnitQuantity(item.quantity)
        return item.type !== 'HYDRATION' && looksLikeLiquidByQuantity
      })

      if (asJson) {
        console.log(
          JSON.stringify(
            {
              environment: isProd ? 'production' : 'development',
              user: {
                id: user?.id || entry.userId,
                name: user?.name || null,
                email: user?.email || null,
                timezone: user?.timezone || 'UTC'
              },
              nutrition: {
                id: entry.id,
                date: dateOnly(entry.date),
                totals: {
                  calories: entry.calories,
                  carbs: entry.carbs,
                  protein: entry.protein,
                  fat: entry.fat,
                  fiber: entry.fiber,
                  sugar: entry.sugar,
                  waterMl: entry.waterMl
                }
              },
              computedTotals: {
                itemsAll: {
                  calories: totalsFromItems.itemCalories,
                  carbs: totalsFromItems.itemCarbs,
                  protein: totalsFromItems.itemProtein,
                  fat: totalsFromItems.itemFat
                },
                itemsFoodOnly: {
                  calories: totalsFromItems.foodCalories,
                  carbs: totalsFromItems.foodCarbs,
                  protein: totalsFromItems.foodProtein,
                  fat: totalsFromItems.foodFat
                },
                hydration: {
                  fromHydrationEntriesMl: totalsFromItems.hydrationEntryMl,
                  fromAllItemsWithWaterMl: totalsFromItems.itemWaterMl,
                  fromAllItemsHydrationContributionMl: totalsFromItems.itemHydrationMl,
                  nutritionRecordWaterMl: entry.waterMl || 0,
                  estimatedMealLinkedBonusMl: mealLinkedBonusMlEstimate,
                  foodItemsWithFluidUnits: totalsFromItems.foodItemsWithFluidUnits,
                  fluidUnitFoodItems
                }
              },
              itemCount: jsonRows.length,
              items: jsonRows
            },
            null,
            2
          )
        )
        return
      }

      console.log(
        chalk.green(`\nUser: ${user?.name || '(no name)'} (${user?.email || entry.userId})`)
      )
      console.log(
        chalk.gray(
          `Nutrition ID: ${entry.id} | Date: ${dateOnly(entry.date)} | TZ: ${user?.timezone || 'UTC'}`
        )
      )
      console.log(
        chalk.gray(
          `Totals (record): kcal=${entry.calories ?? 'n/a'} carbs=${entry.carbs ?? 'n/a'} protein=${entry.protein ?? 'n/a'} fat=${entry.fat ?? 'n/a'} fiber=${entry.fiber ?? 'n/a'} sugar=${entry.sugar ?? 'n/a'} water=${entry.waterMl ?? 0}ml`
        )
      )
      console.log(
        chalk.gray(
          `Totals (items): kcal=${totalsFromItems.itemCalories.toFixed(1)} carbs=${totalsFromItems.itemCarbs.toFixed(1)} protein=${totalsFromItems.itemProtein.toFixed(1)} fat=${totalsFromItems.itemFat.toFixed(1)}`
        )
      )
      console.log(
        chalk.gray(
          `Hydration: hydrationEntries=${Math.round(totalsFromItems.hydrationEntryMl)}ml explicitItemWater=${Math.round(totalsFromItems.itemWaterMl)}ml recordWater=${entry.waterMl ?? 0}ml estimatedMealLinkedBonus=${mealLinkedBonusMlEstimate}ml`
        )
      )
      if (totalsFromItems.foodItemsWithFluidUnits > 0) {
        console.log(
          chalk.yellow(
            `Note: ${totalsFromItems.foodItemsWithFluidUnits} FOOD item(s) use fluid units (ml/L) but are not typed as HYDRATION.`
          )
        )
      }

      if (rows.length === 0) {
        console.log(chalk.yellow('\nNo logged items found in breakfast/lunch/dinner/snacks.'))
        return
      }

      console.log(chalk.bold(`\nLogged Items (${rows.length}):`))
      console.table(rows)
    } catch (error) {
      console.error(chalk.red('Error:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default dayLogCommand
