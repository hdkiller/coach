import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const chatLogCommand = new Command('chat')
  .description('Show chat log for a specific room ID')
  .argument('<roomId>', 'The ID of the chat room')
  .option('--prod', 'Use production database')
  .action(async (roomId, options) => {
    let prisma: PrismaClient | null = null
    let pool: pg.Pool | null = null

    try {
      const isProd = options.prod
      const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

      if (isProd) {
        console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
      }

      if (!connectionString) {
        console.error(chalk.red('Error: Database connection string is not defined.'))
        process.exit(1)
      }

      pool = new pg.Pool({ connectionString })
      const adapter = new PrismaPg(pool)
      prisma = new PrismaClient({ adapter })

      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          users: {
            include: {
              user: true
            }
          }
        }
      })

      if (!room) {
        console.error(chalk.red(`Error: Chat room with ID ${roomId} not found.`))
        return
      }

      console.log(chalk.bold.blue(`\n=== Chat Room: ${room.name || 'Untitled'} (${room.id}) ===`))
      console.log(chalk.gray(`Created: ${room.createdAt.toLocaleString()}`))
      console.log(
        chalk.gray(`Participants: ${room.users.map((u) => u.user.name || u.user.email).join(', ')}`)
      )
      console.log(chalk.blue('='.repeat(60) + '\n'))

      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'asc' }
      })

      if (messages.length === 0) {
        console.log(chalk.yellow('No messages found in this room.'))
        return
      }

      for (const msg of messages) {
        const date = chalk.gray(`[${msg.createdAt.toLocaleTimeString()}]`)
        let sender = msg.senderId
        if (sender === 'ai_agent') {
          sender = chalk.bold.magenta('AI Agent')
        } else if (sender === 'system_tool') {
          sender = chalk.bold.cyan('System Tool')
        } else {
          const participant = room.users.find((u) => u.userId === msg.senderId)
          sender = chalk.bold.green(
            participant?.user.name || participant?.user.email || msg.senderId
          )
        }

        console.log(`${date} ${sender}: ${msg.content || chalk.italic.gray('(no text content)')}`)

        const metadata = msg.metadata as any
        if (metadata) {
          // Tool Calls
          if (metadata.toolCalls && Array.isArray(metadata.toolCalls)) {
            metadata.toolCalls.forEach((tc: any) => {
              console.log(chalk.cyan(`  🛠️  Tool Call: ${chalk.bold(tc.name)}`))
              if (tc.args) {
                console.log(
                  chalk.gray(
                    `     Args: ${JSON.stringify(tc.args, null, 2).replace(/\n/g, '\n     ')}`
                  )
                )
              }
              if (tc.response) {
                const responseStr =
                  typeof tc.response === 'object'
                    ? JSON.stringify(tc.response, null, 2)
                    : String(tc.response)
                console.log(chalk.green(`     Result: ${responseStr.replace(/\n/g, '\n     ')}`))
              }
            })
          }

          // Tool Approval Requests
          if (metadata.toolApprovals && Array.isArray(metadata.toolApprovals)) {
            metadata.toolApprovals.forEach((approval: any) => {
              console.log(chalk.yellow(`  ❓ Tool Approval Request: ${chalk.bold(approval.name)}`))
              if (approval.args) {
                console.log(
                  chalk.gray(
                    `     Args: ${JSON.stringify(approval.args, null, 2).replace(/\n/g, '\n     ')}`
                  )
                )
              }
            })
          }

          // Tool Responses (from system_tool role messages usually)
          if (metadata.toolResponse && Array.isArray(metadata.toolResponse)) {
            metadata.toolResponse.forEach((tr: any) => {
              if (tr.type === 'tool-result') {
                const resultStr =
                  typeof tr.result === 'object'
                    ? JSON.stringify(tr.result, null, 2)
                    : String(tr.result)
                console.log(
                  chalk.green(
                    `  ✅ Tool Result (${tr.toolName}): ${resultStr.replace(/\n/g, '\n     ')}`
                  )
                )
              }
            })
          }
        }
        console.log('')
      }
    } catch (error: any) {
      console.error(chalk.red('Fatal error:'), error)
    } finally {
      if (prisma) await prisma.$disconnect()
      if (pool) await pool.end()
    }
  })

export default chatLogCommand
