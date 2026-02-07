import { Command } from 'commander'
import chalk from 'chalk'
import { prisma } from '../../server/utils/db'
import { getQuotaStatus } from '../../server/utils/quotas/engine'
import { QUOTA_REGISTRY, mapOperationToQuota } from '../../server/utils/quotas/registry'

const quotasCommand = new Command('quotas')
  .description('Check and debug user quotas')
  .argument('<email>', 'User email to check')
  .option('-o, --operation <operation>', 'Operation to check', 'chat')
  .action(async (email, options) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, subscriptionTier: true }
      })

      if (!user) {
        console.log(chalk.red(`User not found: ${email}`))
        return
      }

      console.log(
        chalk.bold(`
Quota Status for: ${user.name || user.email}`)
      )
      console.log(`Tier: ${chalk.cyan(user.subscriptionTier)}`)

      const opsToCheck =
        options.operation === 'all'
          ? Object.keys(QUOTA_REGISTRY[user.subscriptionTier])
          : [options.operation]

      for (const op of opsToCheck) {
        const status = await getQuotaStatus(user.id, op)

        console.log(`
Operation: ${chalk.yellow(op)}`)
        if (!status) {
          console.log(chalk.gray('  No quota defined for this operation/tier.'))
          continue
        }

        const color = status.allowed ? chalk.green : chalk.red
        console.log(`  Allowed: ${color(status.allowed)}`)
        console.log(`  Usage: ${status.used} / ${status.limit}`)
        console.log(`  Remaining: ${status.remaining}`)
        console.log(`  Window: ${status.window}`)
        console.log(`  Enforcement: ${status.enforcement}`)
        if (status.resetsAt) {
          console.log(`  Resets At: ${status.resetsAt.toLocaleString()}`)
        }
      }

      process.exit(0)
    } catch (error) {
      console.error(chalk.red('Error:'), error)
      process.exit(1)
    }
  })

export default quotasCommand
