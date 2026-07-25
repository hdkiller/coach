import { Command } from 'commander'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const createSystemAppCommand = new Command('create-system-app')
  .description('Create a trusted system OAuth application')
  .requiredOption('--name <name>', 'Application name')
  .requiredOption('--owner-email <email>', 'Owner email address')
  .option('--source-name <sourceName>', 'Short source attribution label, e.g. Raycast')
  .option('--client-id <clientId>', 'Custom client ID')
  .option(
    '--redirect-uri <uris>',
    'Comma-separated redirect URIs',
    'http://localhost:3099/callback'
  )
  .option('--official', 'Mark as first-party official app (skips consent when signed in)', false)
  .option(
    '--public-client',
    'Mark as public client for native PKCE (no client secret required at token exchange)',
    false
  )
  .option('--prod', 'Create in production database')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Targeting PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Targeting DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findUnique({
        where: { email: options.ownerEmail }
      })

      if (!user) {
        console.error(chalk.red(`User with email ${options.ownerEmail} not found`))
        process.exit(1)
      }

      const redirectUris = (options.redirectUri as string)
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)

      const crypto = await import('node:crypto')
      const clientId = options.clientId || crypto.randomUUID()
      const clientSecret = crypto.randomBytes(32).toString('hex')

      const app = await prisma.oAuthApp.create({
        data: {
          owner: { connect: { id: user.id } },
          name: options.name,
          sourceName: options.sourceName || null,
          clientId,
          clientSecret,
          redirectUris,
          isTrusted: true,
          isOfficial: Boolean(options.official),
          isPublicClient: Boolean(options.publicClient)
        }
      })

      console.log(chalk.green('\n✅ System application created successfully!'))
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(`${chalk.bold('Name:')}            ${app.name}`)
      if (app.sourceName) {
        console.log(`${chalk.bold('Source Name:')}     ${app.sourceName}`)
      }
      console.log(`${chalk.bold('Client ID:')}       ${app.clientId}`)
      console.log(`${chalk.bold('Client Secret:')}   ${chalk.yellow(app.clientSecret)}`)
      console.log(`${chalk.bold('Redirect URIs:')}   ${redirectUris.join(', ')}`)
      console.log(`${chalk.bold('Trusted:')}         true`)
      console.log(`${chalk.bold('Official:')}        ${Boolean(app.isOfficial)}`)
      console.log(`${chalk.bold('Public Client:')}   ${Boolean(app.isPublicClient)}`)
      console.log(chalk.gray('--------------------------------------------------'))
      if (app.isPublicClient) {
        console.log(
          chalk.cyan(
            'Public client: use Authorization Code + PKCE; client_secret is not required at token exchange.'
          )
        )
      }
      console.log(chalk.gray('--------------------------------------------------\n'))
    } catch (error) {
      console.error(chalk.red('Failed to create system app:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default createSystemAppCommand
