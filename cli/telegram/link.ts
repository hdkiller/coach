import { Command } from 'commander'
import { prisma } from '../../server/utils/db'
import crypto from 'crypto'
import chalk from 'chalk'

const linkCommand = new Command('link')
  .description('Generate a Telegram Deep Link for a user')
  .argument('<email>', 'User email address')
  .action(async (email) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        console.error(chalk.red('❌ User not found: ${email}'))
        process.exit(1)
      }

      // Generate token
      const token = crypto.randomBytes(16).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour for CLI links

      // Store in ShareToken
      await prisma.shareToken.create({
        data: {
          userId: user.id,
          resourceType: 'TELEGRAM_LINK',
          resourceId: 'TELEGRAM',
          token,
          expiresAt
        }
      })

      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'CoachWattsBot'
      const url = `https://t.me/${botUsername}?start=${token}`

      console.log(chalk.green('✅ Link generated successfully!'))
      console.log(`
User: ${chalk.bold(user.name || user.email)}`)
      console.log(`Link: ${chalk.cyan(chalk.bold(url))}`)
      console.log(`
(This link expires in 1 hour)`)
    } catch (error: any) {
      console.error(chalk.red('❌ Error generating link:'), error.message)
      process.exit(1)
    }
  })

export default linkCommand
