import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const nutritionPlanDebugCommand = new Command('nutrition-plan')
  .description('Inspect nutrition plans and saved plan meals for a user/date range')
  .argument('[query]', 'User email, ID, or name')
  .option('--plan-id <id>', 'Inspect one specific nutrition plan by ID')
  .option('--start <YYYY-MM-DD>', 'Range start date', '2026-02-09')
  .option('--end <YYYY-MM-DD>', 'Range end date', '2026-02-15')
  .option('--prod', 'Use production database')
  .action(async (query, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const start = new Date(`${options.start}T00:00:00.000Z`)
    const end = new Date(`${options.end}T23:59:59.999Z`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      console.error(chalk.red('Invalid --start/--end date'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(
        isProd
          ? chalk.yellow('Using PRODUCTION database.')
          : chalk.blue('Using DEVELOPMENT database.')
      )
      console.log(chalk.gray(`Range: ${options.start} -> ${options.end}`))

      let plans: any[] = []
      if (options.planId) {
        const plan = await prisma.nutritionPlan.findUnique({
          where: { id: options.planId },
          include: {
            meals: {
              where: {
                date: {
                  gte: start,
                  lte: end
                }
              },
              orderBy: [{ date: 'asc' }, { scheduledAt: 'asc' }]
            }
          }
        })
        if (plan) {
          const siblingPlans = await prisma.nutritionPlan.findMany({
            where: {
              userId: plan.userId,
              startDate: { lte: new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000) },
              endDate: { gte: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000) }
            },
            orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            include: {
              meals: {
                where: {
                  date: {
                    gte: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000),
                    lte: new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000)
                  }
                },
                orderBy: [{ date: 'asc' }, { scheduledAt: 'asc' }]
              }
            }
          })
          plans = siblingPlans
        }
      } else {
        if (!query) {
          console.error(chalk.red('Provide <query> or --plan-id'))
          process.exit(1)
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: query },
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: { id: true, email: true, name: true, timezone: true }
        })

        if (!user) {
          console.error(chalk.red(`User not found matching "${query}"`))
          process.exit(1)
        }

        console.log(chalk.green(`User: ${user.name} (${user.email})`))
        console.log(chalk.gray(`ID: ${user.id} | TZ: ${user.timezone || 'UTC'}`))

        plans = await prisma.nutritionPlan.findMany({
          where: {
            userId: user.id,
            startDate: { lte: end },
            endDate: { gte: start }
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            meals: {
              where: {
                date: {
                  gte: start,
                  lte: end
                }
              },
              orderBy: [{ date: 'asc' }, { scheduledAt: 'asc' }]
            }
          }
        })
      }

      plans = plans.sort((a, b) => {
        const updatedDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        if (updatedDiff !== 0) return updatedDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      if (options.planId) {
        console.log(chalk.gray(`Plan ID filter: ${options.planId}`))
      }

      // already loaded above
      /*
      const plans = await prisma.nutritionPlan.findMany({
        where: {
          userId: user.id,
          startDate: { lte: end },
          endDate: { gte: start }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          meals: {
            where: {
              date: {
                gte: start,
                lte: end
              }
            },
            orderBy: [{ date: 'asc' }, { scheduledAt: 'asc' }]
          }
        }
      })
      */

      if (!plans.length) {
        console.log(chalk.yellow('No overlapping nutrition plans found.'))
        return
      }

      console.log(chalk.bold(`\nFound ${plans.length} overlapping plan(s):`))
      for (const plan of plans) {
        console.log(
          `\n${chalk.cyan(plan.id)} | ${plan.status} | ${plan.startDate.toISOString().slice(0, 10)} -> ${plan.endDate.toISOString().slice(0, 10)}`
        )
        console.log(
          chalk.gray(
            `updatedAt=${plan.updatedAt.toISOString()} | summaryDays=${(plan.summaryJson as any)?.days?.length || 0} | meals=${plan.meals.length}`
          )
        )

        if (!plan.meals.length) {
          console.log(chalk.gray('  (no meals in range for this plan)'))
          continue
        }

        for (const meal of plan.meals) {
          const totals = (meal.mealJson as any)?.totals || {}
          const title = (meal.mealJson as any)?.title || '(untitled)'
          console.log(
            `  - ${meal.date.toISOString().slice(0, 10)} | ${meal.windowType} | ${title} | carbs=${totals.carbs ?? 0} protein=${totals.protein ?? 0} kcal=${totals.kcal ?? 0} | scheduledAt=${meal.scheduledAt.toISOString()}`
          )
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default nutritionPlanDebugCommand
