import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const adminsCommand = new Command('admins').description('Manage administrator accounts')

async function getPrisma(isProd: boolean) {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

  if (isProd) {
    console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
  } else {
    console.log(chalk.blue('Using DEVELOPMENT database.'))
  }

  if (!connectionString) {
    console.error(chalk.red('Error: Database connection string is not defined.'))
    if (isProd) {
      console.error(chalk.red('Make sure DATABASE_URL_PROD is set in .env'))
    } else {
      console.error(chalk.red('Make sure DATABASE_URL is set in .env'))
    }
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  return { prisma, pool }
}

adminsCommand
  .command('list')
  .alias('ls')
  .description('List all administrator users')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const { prisma, pool } = await getPrisma(options.prod)

    try {
      const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      })

      if (admins.length === 0) {
        console.log(chalk.yellow('No administrators found.'))
      } else {
        console.log(chalk.green(`Found ${admins.length} administrator(s):`))
        console.table(admins)
      }
    } catch (e: any) {
      console.error(chalk.red('Error listing admins:'), e.message)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

adminsCommand
  .command('set')
  .description('Set admin status for a user')
  .argument('<email>', 'User email')
  .argument('<state>', 'true/false')
  .option('--prod', 'Use production database')
  .action(async (email, state, options) => {
    const { prisma, pool } = await getPrisma(options.prod)
    const isAdmin = state === 'true' || state === '1'

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        console.error(chalk.red(`User ${email} not found.`))
        process.exit(1)
      }

      const updatedUser = await prisma.user.update({
        where: { email },
        data: { isAdmin }
      })

      console.log(
        chalk.green(
          `Successfully ${isAdmin ? 'granted' : 'revoked'} admin privileges for ${updatedUser.email}`
        )
      )
    } catch (e: any) {
      console.error(chalk.red('Error updating user:'), e.message)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

adminsCommand
  .command('toggle')
  .description('Toggle admin status for a user')
  .argument('<email>', 'User email')
  .option('--prod', 'Use production database')
  .action(async (email, options) => {
    const { prisma, pool } = await getPrisma(options.prod)

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        console.error(chalk.red(`User ${email} not found.`))
        process.exit(1)
      }

      const newState = !user.isAdmin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { isAdmin: newState }
      })

      console.log(
        chalk.green(
          `Successfully ${newState ? 'granted' : 'revoked'} admin privileges for ${updatedUser.email}`
        )
      )
    } catch (e: any) {
      console.error(chalk.red('Error toggling user:'), e.message)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default adminsCommand
