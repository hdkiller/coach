import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const inspectCommand = new Command('inspect')
  .description('Inspect nutrition and related chat messages for a user')
  .argument('<query>', 'User email, ID, or name')
  .option('--prod', 'Use production database')
  .option('--limit <number>', 'Number of entries to show', '5')
  .action(async (query, options) => {
    const isProd = options.prod
    const limit = parseInt(options.limit)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
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
      // 1. Find User
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
        console.error(chalk.red(`User not found matching "${query}".`))
        return
      }

      console.log(
        chalk.green(`
User: ${user.name} (${user.email})`)
      )
      console.log(chalk.gray(`ID: ${user.id} | Timezone: ${user.timezone || 'UTC'}`))

      // 2. Fetch Nutrition
      const nutrition = await prisma.nutrition.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: limit
      })

      console.log(
        chalk.bold(`
Recent Nutrition Entries (${nutrition.length}):`)
      )
      if (nutrition.length === 0) {
        console.log(chalk.yellow('  No nutrition entries found.'))
      } else {
        nutrition.forEach((e) => {
          const dateStr = e.date.toISOString().split('T')[0]
          console.log(
            chalk.cyan(`
  --- ${dateStr} ---`)
          )
          console.log(
            `  Calories: ${e.calories} | Carbs: ${e.carbs}g | Protein: ${e.protein}g | Fat: ${e.fat}g`
          )
          if (e.breakfast) console.log(chalk.gray(`  Breakfast: ${JSON.stringify(e.breakfast)}`))
          if (e.lunch) console.log(chalk.gray(`  Lunch: ${JSON.stringify(e.lunch)}`))
          if (e.dinner) console.log(chalk.gray(`  Dinner: ${JSON.stringify(e.dinner)}`))
          if (e.snacks) console.log(chalk.gray(`  Snacks: ${JSON.stringify(e.snacks)}`))
        })
      }

      // 3. Fetch Chat Messages
      const messages = await prisma.chatMessage.findMany({
        where: { senderId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      console.log(
        chalk.bold(`
Recent User Chat Messages (${messages.length}):`)
      )
      if (messages.length === 0) {
        console.log(chalk.yellow('  No chat messages found.'))
      } else {
        messages.forEach((m) => {
          console.log(
            `  [${m.createdAt.toISOString()}] ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
          )
        })
      }

      // 4. Fetch Audit Logs for tool calls
      const logs = await prisma.auditLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      console.log(
        chalk.bold(`
Recent Audit Logs (${logs.length}):`)
      )
      logs.forEach((l) => {
        console.log(
          `  [${l.createdAt.toISOString()}] ${chalk.yellow(l.action)} ${JSON.stringify(l.metadata || {})}`
        )
      })
    } catch (e) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default inspectCommand
