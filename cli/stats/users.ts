import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const usersStatsCommand = new Command('users')

usersStatsCommand
  .description('Show user statistics')
  .option('--prod', 'Use DATABASE_URL_PROD from .env')
  .action(async (options) => {
    const dbUrl = options.prod ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!dbUrl) {
      console.error(chalk.red('Error: DATABASE_URL (or DATABASE_URL_PROD) is not set.'))
      process.exit(1)
    }

    // Mask password in logs
    console.log(chalk.blue(`Connecting to database...`))

    const pool = new pg.Pool({ connectionString: dbUrl })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      // Total users
      const totalUsers = await prisma.user.count()
      console.log(
        chalk.bold(`
Total Users: ${totalUsers}`)
      )

      // Users by Country
      console.log(chalk.bold('\nUsers by Country:'))
      const byCountry = await prisma.user.groupBy({
        by: ['country'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      })

      console.table(
        byCountry.map((c) => ({
          Country: c.country || 'Unknown',
          Count: c._count.id
        }))
      )
    } catch (error: any) {
      console.error(chalk.red('Error fetching stats:'), error.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default usersStatsCommand
