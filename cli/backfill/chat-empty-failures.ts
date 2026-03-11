import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

function hasVisibleAssistantArtifacts(metadata: Record<string, any> | null | undefined) {
  if (!metadata) return false

  return (
    (Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0) ||
    (Array.isArray(metadata.toolApprovals) && metadata.toolApprovals.length > 0) ||
    (Array.isArray(metadata.toolResults) && metadata.toolResults.length > 0)
  )
}

const backfillChatEmptyFailuresCommand = new Command('chat-empty-failures')
  .description('Mark blank failed assistant drafts so chat UI hides ghost bubbles')
  .option('-d, --dry-run', 'Dry run mode (do not commit changes)', false)
  .option('--prod', 'Use production database', false)
  .action(async (options) => {
    console.log(chalk.blue('=== Backfill Empty Failed Chat Drafts ==='))
    console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`)

    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    if (isProd) {
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

    try {
      const messages = await prisma.chatMessage.findMany({
        where: {
          senderId: 'ai_agent',
          turn: {
            status: {
              in: ['FAILED', 'INTERRUPTED']
            }
          }
        },
        select: {
          id: true,
          content: true,
          metadata: true,
          turn: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      let scanned = 0
      let updated = 0

      for (const message of messages) {
        scanned += 1
        const metadata = ((message.metadata as any) || {}) as Record<string, any>
        const turnStatus = String(metadata.turnStatus || message.turn?.status || '')
        const isFailure = turnStatus === 'FAILED' || turnStatus === 'INTERRUPTED'
        const isBlank = typeof message.content !== 'string' || message.content.trim().length === 0
        const shouldHide =
          isFailure &&
          isBlank &&
          !hasVisibleAssistantArtifacts(metadata) &&
          !metadata.hiddenBecauseEmptyFailure

        if (!shouldHide) {
          continue
        }

        updated += 1

        if (options.dryRun) {
          console.log(
            chalk.gray(
              `[DRY RUN] Would mark message ${message.id} (turn ${message.turn?.id || 'unknown'}) as hidden empty failure`
            )
          )
          continue
        }

        await prisma.chatMessage.update({
          where: { id: message.id },
          data: {
            metadata: {
              ...metadata,
              hideUntilContent: false,
              hiddenBecauseEmptyFailure: true
            } as any
          }
        })
      }

      console.log(chalk.bold('\n=== Summary ==='))
      console.log(`Messages scanned: ${scanned}`)
      console.log(
        options.dryRun ? `Messages to update: ${updated}` : `Messages updated: ${updated}`
      )
    } catch (error) {
      console.error(chalk.red('Error during backfill:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillChatEmptyFailuresCommand
