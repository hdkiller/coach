import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient, BugStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { sendToUser } from '../../server/utils/ws-state'

export const ticketsCommand = new Command('tickets').description(
  'Manage support tickets (Bug Reports)'
)

const getPrisma = (isProd: boolean) => {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
  if (!connectionString) {
    console.error(chalk.red('Error: Database connection string is not defined.'))
    process.exit(1)
  }
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return { prisma: new PrismaClient({ adapter }), pool }
}

async function createUserNotificationWithClient(
  prisma: PrismaClient,
  userId: string,
  data: { title: string; message: string; icon?: string; link?: string }
) {
  const notification = await prisma.userNotification.create({
    data: {
      userId,
      title: data.title,
      message: data.message,
      icon: data.icon,
      link: data.link
    }
  })

  await sendToUser(userId, {
    type: 'notification_new',
    notification: {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      icon: notification.icon,
      link: notification.link,
      createdAt: notification.createdAt,
      read: notification.read
    }
  })

  return notification
}

ticketsCommand
  .command('get <id>')
  .description('Get full details of a specific ticket')
  .option('--prod', 'Use production database')
  .action(async (id, options) => {
    const { prisma, pool } = getPrisma(options.prod)
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      const ticket = await prisma.bugReport.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          title: true,
          description: true,
          context: true,
          logs: true,
          status: true,
          priority: true,
          metadata: true,
          createdAt: true,
          comments: {
            select: {
              id: true,
              content: true,
              type: true,
              createdAt: true,
              user: {
                select: {
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      if (!ticket) {
        console.log(chalk.red(`Ticket ${id} not found.`))
        return
      }

      // Fetch user separately
      const user = await prisma.user.findUnique({
        where: { id: ticket.userId }
      })

      console.log(chalk.bold.blue('\\n--- TICKET DETAILS ---'))
      console.log(chalk.bold('ID:'), ticket.id)
      console.log(chalk.bold('Status:'), ticket.status)
      console.log(chalk.bold('Priority:'), ticket.priority || 'N/A')
      console.log(chalk.bold('Created At:'), ticket.createdAt)
      if (user) {
        console.log(chalk.bold('User:'), `${user.email} (${ticket.userId})`)
      } else {
        console.log(chalk.bold('User:'), `Unknown (${ticket.userId})`)
      }
      console.log(chalk.bold('Title:'), ticket.title)
      console.log(chalk.bold('Description:\\n'), ticket.description)

      if (ticket.context) {
        console.log(chalk.bold('\\nContext:'))
        console.log(JSON.stringify(ticket.context, null, 2))
      }
      if (ticket.logs) {
        console.log(chalk.bold('\\nLogs:\\n'), ticket.logs)
      }
      if (ticket.comments.length > 0) {
        console.log(chalk.bold('\\nComments:'))
        ticket.comments.forEach((c) => {
          const typeLabel = c.type === 'NOTE' ? chalk.yellow('[NOTE]') : chalk.blue('[MESSAGE]')
          console.log(`${typeLabel} [${c.createdAt.toISOString()}] ${c.user.email}: ${c.content}`)
        })
      }

      console.log(chalk.bold.blue('----------------------\\n'))
      console.log(
        chalk.green(
          'Agent Tip: Use other cw:cli tools to validate the issue described above. For example, check logs, users, workouts, etc.'
        )
      )
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

ticketsCommand
  .command('update-status <id> <status>')
  .description(
    'Update the status of a ticket (OPEN, IN_PROGRESS, RESOLVED, CLOSED, DUPLICATE, WONT_FIX)'
  )
  .option('--prod', 'Use production database')
  .action(async (id, status, options) => {
    const { prisma, pool } = getPrisma(options.prod)
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      if (!Object.values(BugStatus).includes(status as BugStatus)) {
        console.error(
          chalk.red(`Invalid status. Must be one of: ${Object.values(BugStatus).join(', ')}`)
        )
        return
      }

      const ticket = await prisma.bugReport.update({
        where: { id },
        data: { status: status as BugStatus }
      })

      await createUserNotificationWithClient(prisma, ticket.userId, {
        title: 'Issue Updated',
        message: `Your issue "${ticket.title}" status is now ${ticket.status.replace(/_/g, ' ')}.`,
        icon: 'i-heroicons-bug-ant',
        link: `/issues/${ticket.id}`
      })

      console.log(chalk.green(`Successfully updated ticket ${id} to status ${status}`))
    } catch (error) {
      console.error(chalk.red('Error updating ticket:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

ticketsCommand
  .command('comment <id> <message>')
  .description('Add an internal comment or a message to a ticket')
  .option('--prod', 'Use production database')
  .option('--type <type>', 'Type of comment: NOTE (internal) or MESSAGE (visible to user)', 'NOTE')
  .option(
    '--user-id <userId>',
    'ID of the admin user making the comment. Defaults to a system message if omitted.'
  )
  .action(async (id, message, options) => {
    const { prisma, pool } = getPrisma(options.prod)
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      const type = options.type.toUpperCase()
      if (type !== 'NOTE' && type !== 'MESSAGE') {
        console.error(chalk.red('Invalid type. Must be NOTE or MESSAGE.'))
        return
      }

      // Convert literal escaped \n strings from shell arguments to actual newlines
      const processedMessage = message.replace(/\\n/g, '\n')

      let userId = options.userId
      if (!userId) {
        // 1. Try to find the specific agent from .env
        if (process.env.SUPPORT_AGENT_USER) {
          const agent = await prisma.user.findUnique({
            where: { email: process.env.SUPPORT_AGENT_USER }
          })
          if (agent) {
            userId = agent.id
          }
        }

        // 2. Fallback to any admin if no specific agent or agent not found
        if (!userId) {
          const admin = await prisma.user.findFirst({ where: { isAdmin: true } })
          if (admin) {
            userId = admin.id
          }
        }

        if (!userId) {
          console.error(
            chalk.red(
              'No user-id provided, SUPPORT_AGENT_USER not found, and no ADMIN found in DB.'
            )
          )
          return
        }
      }

      await prisma.bugReportComment.create({
        data: {
          bugReportId: id,
          content: processedMessage,
          userId,
          isAdmin: true,
          type
        }
      })

      if (type === 'MESSAGE') {
        const report = await prisma.bugReport.findUnique({
          where: { id },
          select: { id: true, userId: true, title: true }
        })

        if (report) {
          await createUserNotificationWithClient(prisma, report.userId, {
            title: 'New Developer Comment',
            message: `A developer commented on your issue: "${report.title}"`,
            icon: 'i-heroicons-chat-bubble-left-right',
            link: `/issues/${report.id}`
          })
        }
      }

      console.log(chalk.green(`Successfully added ${type} to ticket ${id}`))
    } catch (error) {
      console.error(chalk.red('Error adding comment:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

ticketsCommand
  .command('list')
  .description('List support tickets')
  .option('--all', 'Show all tickets including closed/resolved', false)
  .option('--limit <number>', 'Limit the number of tickets shown', '10')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const { prisma, pool } = getPrisma(options.prod)
    const limit = parseInt(options.limit)
    const showAll = options.all
    try {
      if (options.prod) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      const where = showAll
        ? {}
        : {
            status: {
              in: ['OPEN', 'IN_PROGRESS']
            }
          }

      const reports = await prisma.bugReport.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true }
          }
        }
      })

      if (reports.length === 0) {
        console.log(chalk.yellow('No tickets found.'))
      } else {
        console.table(
          reports.map((r) => ({
            ID: r.id,
            Status: r.status,
            Title: r.title.length > 50 ? r.title.substring(0, 47) + '...' : r.title,
            User: r.user.email,
            Created: r.createdAt.toISOString().split('T')[0]
          }))
        )
      }
    } catch (error) {
      console.error(chalk.red('Error fetching tickets:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })
