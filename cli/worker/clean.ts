import { Command } from 'commander'
import chalk from 'chalk'
import { webhookQueue, pingQueue, streamsQueue } from '../../server/utils/queue'
import { prisma } from '../../server/utils/db'

type QueueState = 'completed' | 'failed' | 'delayed' | 'wait' | 'active' | 'paused'

async function cleanQueue(
  queue: { clean: (grace: number, limit: number, type?: string) => Promise<string[]> },
  name: string,
  states: QueueState[],
  graceMs: number,
  limit: number,
  dryRun: boolean
) {
  let totalRemoved = 0

  for (const state of states) {
    if (dryRun) {
      console.log(chalk.gray(`[dry-run] Would clean ${state} jobs from ${name}`))
      continue
    }

    const removed = await queue.clean(graceMs, limit, state)
    totalRemoved += removed.length
    if (removed.length > 0) {
      console.log(chalk.green(`Removed ${removed.length} ${state} jobs from ${name}`))
    }
  }

  return totalRemoved
}

export const cleanCommand = new Command('clean')
  .description('Prune completed/failed BullMQ jobs to free Redis memory')
  .option('--grace <ms>', 'Grace period before a job can be removed', '0')
  .option('--limit <n>', 'Max jobs to remove per state', '10000')
  .option('--dry-run', 'Show what would be cleaned without deleting')
  .action(async (options) => {
    const graceMs = parseInt(String(options.grace), 10)
    const limit = parseInt(String(options.limit), 10)
    const dryRun = Boolean(options.dryRun)

    try {
      console.log(chalk.blue.bold('Cleaning BullMQ queues...'))

      const webhookRemoved = await cleanQueue(
        webhookQueue,
        'webhookQueue',
        ['completed', 'failed'],
        graceMs,
        limit,
        dryRun
      )

      const pingRemoved = await cleanQueue(
        pingQueue,
        'pingQueue',
        ['completed', 'failed'],
        graceMs,
        limit,
        dryRun
      )

      const streamsRemoved = await cleanQueue(
        streamsQueue,
        'streamsQueue',
        ['completed', 'failed'],
        graceMs,
        limit,
        dryRun
      )

      console.log(
        chalk.white.bold(
          `\nTotal removed: ${webhookRemoved + pingRemoved + streamsRemoved} (${webhookRemoved} webhook, ${streamsRemoved} streams, ${pingRemoved} ping)`
        )
      )
    } catch (error: any) {
      console.error(chalk.red('Failed to clean queues:'), error)
      process.exitCode = 1
    } finally {
      await Promise.all([webhookQueue.close(), pingQueue.close(), streamsQueue.close()])
      await prisma.$disconnect()
      process.exit(process.exitCode || 0)
    }
  })
