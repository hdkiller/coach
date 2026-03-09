import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { transformHistoryToCoreMessages } from '../../server/utils/ai-history'
import { normalizeCoreMessagesForGemini } from '../../server/utils/chat/core-message-normalizer'

type DiagnosticFinding = {
  code: string
  detail: string
  severity: 'fatal' | 'suspicious' | 'info'
}

function getToolCallIds(message: any): string[] {
  if (!Array.isArray(message?.content)) return []
  return message.content
    .filter((part: any) => part?.type === 'tool-call' && typeof part.toolCallId === 'string')
    .map((part: any) => part.toolCallId)
}

function hasLeadingAssistantToolCall(messages: any[]) {
  return getToolCallIds(messages[0]).length > 0
}

function findConsecutiveToolMessages(messages: any[]) {
  const findings: DiagnosticFinding[] = []

  for (let index = 1; index < messages.length; index += 1) {
    if (messages[index - 1]?.role !== 'tool' || messages[index]?.role !== 'tool') continue

    findings.push({
      code: 'consecutive_tool_messages',
      detail: `Messages ${index - 1} and ${index} are both tool turns.`,
      severity: 'suspicious'
    })
  }

  return findings
}

function diagnoseMessageSequence(label: string, messages: any[]) {
  const findings: DiagnosticFinding[] = []

  if (messages.length === 0) {
    findings.push({
      code: 'empty_sequence',
      detail: `${label} message list is empty.`,
      severity: 'info'
    })
    return findings
  }

  const firstRole = messages[0]?.role
  if (firstRole !== 'user') {
    findings.push({
      code: 'invalid_start_role',
      detail: `${label} starts with ${firstRole || 'unknown'} instead of user.`,
      severity: label === 'normalized' ? 'fatal' : 'suspicious'
    })
  }

  if (firstRole === 'assistant' && hasLeadingAssistantToolCall(messages)) {
    findings.push({
      code: 'leading_assistant_tool_call',
      detail: `${label} starts with an assistant tool-call turn, which Gemini rejects.`,
      severity: label === 'normalized' || label === 'core' ? 'fatal' : 'suspicious'
    })
  }

  findings.push(
    ...findConsecutiveToolMessages(messages).map((finding) => ({
      ...finding,
      detail: `${label}: ${finding.detail}`
    }))
  )

  return findings
}

function summarizeFindings(findings: DiagnosticFinding[]) {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1
      acc.byCode.set(finding.code, (acc.byCode.get(finding.code) || 0) + 1)
      return acc
    },
    {
      fatal: 0,
      suspicious: 0,
      info: 0,
      byCode: new Map<string, number>()
    }
  )
}

const chatGeminiCommand = new Command('chat-gemini')
  .description('Scan chat turns for Gemini-invalid history sequencing')
  .option('-l, --limit <number>', 'Number of recent turns to inspect', '50')
  .option('-r, --roomId <string>', 'Inspect all turns for a room')
  .option('-t, --turnId <string>', 'Inspect a single turn')
  .option('--prod', 'Use production database')
  .action(async (options) => {
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
      prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

      const where = options.turnId
        ? { id: options.turnId }
        : options.roomId
          ? { roomId: options.roomId }
          : {}

      const turns = await prisma.chatTurn.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.turnId || options.roomId ? undefined : parseInt(options.limit, 10),
        include: {
          llmUsage: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (turns.length === 0) {
        console.log(chalk.yellow('No matching turns found.'))
        return
      }

      let problematicTurns = 0
      let fatalTurns = 0
      const aggregateByCode = new Map<string, number>()

      for (const turn of turns.reverse()) {
        const requestMessages = Array.isArray((turn.metadata as any)?.request?.messages)
          ? (turn.metadata as any).request.messages
          : []

        const coreMessages = await transformHistoryToCoreMessages(requestMessages)
        const normalizedMessages = normalizeCoreMessagesForGemini(coreMessages)

        const findings = [
          ...diagnoseMessageSequence('request', requestMessages),
          ...diagnoseMessageSequence('core', coreMessages),
          ...diagnoseMessageSequence('normalized', normalizedMessages)
        ]

        if (findings.length === 0) continue

        problematicTurns += 1
        const summary = summarizeFindings(findings)
        if (summary.fatal > 0) {
          fatalTurns += 1
        }
        console.log(
          chalk.red(
            `\n[${turn.status}] room=${turn.roomId} turn=${turn.id} created=${turn.createdAt.toISOString()}`
          )
        )
        if (turn.failureReason) {
          console.log(chalk.gray(`  failure: ${turn.failureReason}`))
        }
        const latestUsage = turn.llmUsage[0]
        if (latestUsage) {
          console.log(
            chalk.gray(
              `  usage: operation=${latestUsage.operation} model=${latestUsage.model} error=${latestUsage.errorType || 'none'}`
            )
          )
        }
        console.log(
          chalk.gray(
            `  severity: fatal=${summary.fatal} suspicious=${summary.suspicious} info=${summary.info}`
          )
        )
        findings.forEach((finding) => {
          aggregateByCode.set(finding.code, (aggregateByCode.get(finding.code) || 0) + 1)
          const color =
            finding.severity === 'fatal'
              ? chalk.red
              : finding.severity === 'suspicious'
                ? chalk.yellow
                : chalk.gray
          console.log(color(`  - [${finding.severity}] ${finding.code}: ${finding.detail}`))
        })
      }

      if (problematicTurns === 0) {
        console.log(chalk.green('No sequencing issues detected in the inspected turns.'))
        return
      }

      console.log(
        chalk.red(
          `\nDetected sequencing issues in ${problematicTurns} turn(s), ${fatalTurns} fatal.`
        )
      )
      Array.from(aggregateByCode.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          console.log(chalk.gray(`  ${code}: ${count}`))
        })
    } catch (error: any) {
      console.error(chalk.red('Fatal error:'), error)
    } finally {
      if (prisma) await prisma.$disconnect()
      if (pool) await pool.end()
    }
  })

export default chatGeminiCommand
