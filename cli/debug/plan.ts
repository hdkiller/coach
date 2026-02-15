import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import { trainingPlanRepository } from '../../server/utils/repositories/trainingPlanRepository'

const planDebugCommand = new Command('plan')
  .description('Debug training plan structure and workouts')
  .option('--prod', 'Use production database')
  .option('--id <id>', 'Specific plan ID')
  .option('--email <email>', 'User email to debug')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.bold(`\n--- Training Plan Debugger ---`))

      let user = null
      if (options.email) {
        user = await prisma.user.findFirst({
          where: { email: options.email }
        })
      }

      if (options.email && !user) {
        console.error(chalk.red(`User with email ${options.email} not found`))
        return
      }

      const plan = await prisma.trainingPlan.findFirst({
        where: options.id ? { id: options.id } : { userId: user?.id, status: 'ACTIVE' },
        include: {
          blocks: {
            orderBy: { order: 'asc' },
            include: {
              weeks: {
                orderBy: { weekNumber: 'asc' },
                include: {
                  workouts: {
                    orderBy: { date: 'asc' }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!plan) {
        console.log(chalk.yellow('No active plan found for user.'))
        return
      }

      console.log(`${chalk.bold('Plan:')} ${plan.name || 'Untitled'} (${plan.id})`)
      console.log(`${chalk.bold('Status:')} ${plan.status}`)
      console.log(
        `${chalk.bold('Range:')} ${plan.startDate?.toISOString().split('T')[0]} to ${plan.targetDate?.toISOString().split('T')[0]}`
      )

      plan.blocks.forEach((block) => {
        console.log(`\n  ${chalk.blue.bold('█ Block ' + block.order + ':')} ${block.name} (${block.type})
`)
        console.log(`    ID: ${block.id} | Weeks: ${block.durationWeeks}`)

        if (block.weeks.length === 0) {
          console.log(chalk.red('    ⚠️ No weeks found in this block!'))
        }

        block.weeks.forEach((week) => {
          const workoutCount = week.workouts.length
          const statusColor = workoutCount > 0 ? chalk.green : chalk.red
          console.log(
            `    ${chalk.bold('Week ' + week.weekNumber + ':')} ${week.startDate.toISOString().split('T')[0]} - ${week.endDate.toISOString().split('T')[0]} | ${statusColor(workoutCount + ' workouts')}`
          )

          if (workoutCount > 0) {
            week.workouts.slice(0, 3).forEach((w) => {
              console.log(`      - ${w.date.toISOString().split('T')[0]}: ${w.title} (${w.type})`)
            })
            if (workoutCount > 3) console.log(`      ... and ${workoutCount - 3} more`)
          }
        })
      })

      console.log('\n------------------------------\n')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default planDebugCommand
