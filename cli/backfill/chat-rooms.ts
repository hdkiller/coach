import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const backfillChatRoomsCommand = new Command('chat-rooms')
  .description('Backfill ChatRoom.lastMessageAt field from latest message')
  .option('-d, --dry-run', 'Dry run mode (do not commit changes)', false)
  .option('--prod', 'Use production database', false)
  .action(async (options) => {
    console.log(chalk.blue('=== Backfill Chat Room Activity ==='))
    console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`)

    // Database selection logic
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    // Initialize Prisma Client dynamically
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const rooms = await prisma.chatRoom.findMany({
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      })

      console.log(`Found ${rooms.length} rooms to process.\n`)

      let totalUpdated = 0

      for (const room of rooms) {
        const lastMessage = room.messages[0]
        const lastMessageAt = lastMessage ? lastMessage.createdAt : room.createdAt

        // Only update if it's different or null
        if (!room.lastMessageAt || room.lastMessageAt.getTime() !== lastMessageAt.getTime()) {
          if (options.dryRun) {
            console.log(
              chalk.gray(
                `[DRY RUN] Would update room ${room.id} (${room.name || 'Unnamed'}) with lastMessageAt: ${lastMessageAt.toISOString()}`
              )
            )
          } else {
            await prisma.chatRoom.update({
              where: { id: room.id },
              data: { lastMessageAt }
            })
            console.log(chalk.green(`✓ Updated room ${room.id} (${room.name || 'Unnamed'})`))
          }
          totalUpdated++
        }
      }

      console.log(chalk.bold('\n=== Summary ==='))
      if (options.dryRun) {
        console.log(`Total Rooms That Would Be Updated: ${totalUpdated}`)
      } else {
        console.log(`Total Rooms Updated: ${totalUpdated}`)
      }
      console.log(`Total Rooms Checked: ${rooms.length}`)
    } catch (error) {
      console.error(chalk.red('Error during backfill:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  })

export default backfillChatRoomsCommand
