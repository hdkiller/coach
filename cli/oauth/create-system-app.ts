import { Command } from 'commander'
import { prisma } from '../../server/utils/db'
import { oauthRepository } from '../../server/utils/repositories/oauthRepository'
import chalk from 'chalk'

const createSystemAppCommand = new Command('create-system-app')
  .description('Create a trusted system OAuth application')
  .requiredOption('--name <name>', 'Application name')
  .requiredOption('--owner-email <email>', 'Owner email address')
  .option('--source-name <sourceName>', 'Short source attribution label, e.g. RunGap')
  .option('--redirect-uri <uri>', 'Redirect URI', 'http://localhost:3099/callback')
  .option('--official', 'Mark as first-party official app (skips consent when signed in)', false)
  .option(
    '--public-client',
    'Mark as public client for native PKCE (no client secret required at token exchange)',
    false
  )
  .action(async (options) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: options.ownerEmail }
      })

      if (!user) {
        console.error(chalk.red(`User with email ${options.ownerEmail} not found`))
        process.exit(1)
      }

      const app = await oauthRepository.createApp(user.id, {
        name: options.name,
        sourceName: options.sourceName,
        redirectUris: [options.redirectUri]
      })

      await prisma.oAuthApp.update({
        where: { id: app.id },
        data: {
          isTrusted: true,
          isOfficial: Boolean(options.official),
          isPublicClient: Boolean(options.publicClient)
        }
      })

      console.log(chalk.green('\n✅ System application created successfully!'))
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(`${chalk.bold('Name:')}            ${options.name}`)
      if (options.sourceName) {
        console.log(`${chalk.bold('Source Name:')}     ${options.sourceName}`)
      }
      console.log(`${chalk.bold('Client ID:')}       ${app.clientId}`)
      console.log(`${chalk.bold('Client Secret:')}   ${chalk.yellow(app.clientSecret)}`)
      console.log(`${chalk.bold('Trusted:')}         true`)
      console.log(`${chalk.bold('Official:')}        ${Boolean(options.official)}`)
      console.log(`${chalk.bold('Public Client:')}   ${Boolean(options.publicClient)}`)
      console.log(chalk.gray('--------------------------------------------------'))
      if (options.publicClient) {
        console.log(
          chalk.cyan(
            'Public client: use Authorization Code + PKCE; client_secret is not required at token exchange.'
          )
        )
      }
      console.log(
        chalk.cyan(
          'REST scopes include chat:*, nutrition:*, and profile:write (see docs/developer/scopes.md).'
        )
      )
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(chalk.red('IMPORTANT: Copy the secret now, it will not be shown again.'))
      console.log(chalk.gray('--------------------------------------------------\n'))
    } catch (error) {
      console.error(chalk.red('Failed to create system app:'), error)
    } finally {
      await prisma.$disconnect()
    }
  })

export default createSystemAppCommand
