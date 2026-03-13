import { Command } from 'commander'
import chalk from 'chalk'
import pg from 'pg'

type ChatRoomRow = {
  id: string
  name: string | null
  createdAt: string
  updatedAt: string
}

type ParticipantRow = {
  userId: string
  email: string | null
  name: string | null
}

type TurnRow = {
  id: string
  roomId: string
  userMessageId: string
  assistantMessageId: string | null
  status: string
  failureReason: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  lastHeartbeatAt: string | null
  metadata: Record<string, any> | null
}

type EventRow = {
  id: string
  turnId: string
  type: string
  data: Record<string, any> | null
  createdAt: string
}

type ToolExecutionRow = {
  id: string
  turnId: string
  toolName: string
  status: string
  result: any
  error: string | null
  metadata: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

type MessageRow = {
  id: string
  roomId: string
  turnId: string | null
  senderId: string
  content: string
  createdAt: string
  updatedAt: string
  metadata: Record<string, any> | null
}

type TurnFinding = {
  severity: 'high' | 'medium' | 'info'
  code: string
  detail: string
}

type TargetResolution = {
  roomId: string
  reason: string
}

const DEFAULT_RECENT_TURNS = 6
const DEFAULT_RECENT_MESSAGES = 12
const FALLBACK_RESPONSE_TEXT =
  'I hit a response issue while processing that. Please retry your last message.'

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getConnectionString(isProd: boolean) {
  return isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
}

function formatTimestamp(value?: string | null) {
  return value ? new Date(value).toISOString() : 'n/a'
}

function formatSnippet(value?: string | null, maxLength = 140) {
  if (!value) return '(empty)'
  const singleLine = value.replace(/\s+/g, ' ').trim()
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength - 1)}…`
}

function getSkillSelection(metadata: Record<string, any> | null | undefined) {
  return metadata?.skillSelection || null
}

function getToolApprovals(message: MessageRow | undefined) {
  return Array.isArray(message?.metadata?.toolApprovals) ? message?.metadata?.toolApprovals : []
}

function getToolCalls(message: MessageRow | undefined) {
  return Array.isArray(message?.metadata?.toolCalls) ? message?.metadata?.toolCalls : []
}

function getMessageRole(senderId: string) {
  if (senderId === 'ai_agent') return 'assistant'
  if (senderId === 'system_tool') return 'tool'
  return 'user'
}

function looksLikeApprovalReply(message: MessageRow | undefined) {
  if (!message) return false
  const normalized = message.content.trim().toLowerCase()
  return ['yes', 'y', 'approve', 'approved', 'ok', 'okay', 'igen', 'jo', 'jó'].includes(normalized)
}

function looksLikePlainTextConfirmation(message: MessageRow | undefined) {
  if (!message?.content) return false
  return /confirm|approve|megerősít|töröljem|should i|do you want me/i.test(message.content)
}

function summarizeEvent(event: EventRow) {
  const data = event.data || {}

  if (event.type === 'slow_response') {
    return `${event.type} reason=${data.reason || 'n/a'} phase=${data.phase || 'n/a'} attempt=${data.attempt ?? 'n/a'}`
  }
  if (event.type === 'first_output_received') {
    return `${event.type} source=${data.source || 'n/a'} toolCalls=${data.toolCallCount ?? 'n/a'} toolResults=${data.toolResultCount ?? 'n/a'} latencyMs=${data.firstOutputLatencyMs ?? 'n/a'}`
  }
  if (
    event.type === 'tool_call_started' ||
    event.type === 'tool_call_completed' ||
    event.type === 'tool_call_failed'
  ) {
    return `${event.type} tool=${data.toolName || 'n/a'}`
  }
  if (event.type === 'turn_completed') {
    return `${event.type} assistantMessageId=${data.assistantMessageId || 'n/a'} durationMs=${data.executionDurationMs ?? 'n/a'}`
  }
  if (event.type === 'turn_interrupted' || event.type === 'turn_failed') {
    return `${event.type} reason=${data.reason || data.failureReason || 'n/a'}`
  }

  return event.type
}

function buildTurnFindings(
  turn: TurnRow,
  messages: MessageRow[],
  events: EventRow[],
  tools: ToolExecutionRow[]
) {
  const findings: TurnFinding[] = []
  const userMessage = messages.find((message) => message.id === turn.userMessageId)
  const assistantMessage = turn.assistantMessageId
    ? messages.find((message) => message.id === turn.assistantMessageId)
    : messages.find((message) => message.senderId === 'ai_agent')
  const skillSelection = getSkillSelection(turn.metadata)
  const useTools = !!skillSelection?.useTools
  const assistantToolCalls = getToolCalls(assistantMessage)
  const approvalRequests = getToolApprovals(assistantMessage)
  const hasFallbackResponse = assistantMessage?.content?.trim() === FALLBACK_RESPONSE_TEXT
  const emptyResponseRetry = events.some(
    (event) => event.type === 'slow_response' && event.data?.reason === 'empty_response_retry'
  )
  const heartbeatTimeout =
    turn.failureReason === 'heartbeat_timeout' ||
    assistantMessage?.metadata?.timeoutReason === 'heartbeat_timeout'

  if (
    useTools &&
    tools.length === 0 &&
    assistantToolCalls.length === 0 &&
    turn.status === 'COMPLETED'
  ) {
    findings.push({
      severity: 'high',
      code: 'tool_enabled_without_tool_execution',
      detail: 'Turn was tool-enabled but completed without any tool execution.'
    })
  }

  if (hasFallbackResponse) {
    findings.push({
      severity: 'high',
      code: 'executor_fallback_response',
      detail: 'Executor fallback response was persisted instead of a domain-specific answer.'
    })
  }

  if (emptyResponseRetry) {
    findings.push({
      severity: 'medium',
      code: 'empty_response_retry',
      detail: 'The executor retried after an empty model response before finishing the turn.'
    })
  }

  if (heartbeatTimeout) {
    findings.push({
      severity: 'high',
      code: 'heartbeat_timeout',
      detail:
        'Turn stopped heartbeating and was interrupted before a visible completion path finished.'
    })
  }

  if (approvalRequests.length > 0) {
    findings.push({
      severity: 'info',
      code: 'approval_requested',
      detail: `Turn requested approval for ${approvalRequests.map((entry: any) => entry.name).join(', ')}.`
    })
  }

  if (
    looksLikeApprovalReply(userMessage) &&
    useTools &&
    tools.length === 0 &&
    assistantToolCalls.length === 0
  ) {
    findings.push({
      severity: 'high',
      code: 'approval_reply_without_execution',
      detail: 'User appears to have approved a pending action, but no tool executed in this turn.'
    })
  }

  if (
    looksLikePlainTextConfirmation(assistantMessage) &&
    tools.length === 0 &&
    approvalRequests.length === 0
  ) {
    findings.push({
      severity: 'medium',
      code: 'plain_text_confirmation_without_tool_call',
      detail:
        'Assistant asked for confirmation in text without first creating a tool-driven approval request.'
    })
  }

  return findings
}

async function resolveTargetRoom(
  pool: pg.Pool,
  roomIdArg: string | undefined,
  options: { room?: string; turn?: string; user?: string }
): Promise<TargetResolution | null> {
  if (roomIdArg || options.room) {
    return {
      roomId: roomIdArg || options.room || '',
      reason: 'explicit room id'
    }
  }

  if (options.turn) {
    const turnResult = await pool.query<{ roomId: string }>(
      'SELECT "roomId" FROM "ChatTurn" WHERE id = $1 LIMIT 1',
      [options.turn]
    )

    if (turnResult.rows[0]) {
      return {
        roomId: turnResult.rows[0].roomId,
        reason: `turn ${options.turn}`
      }
    }

    return null
  }

  if (options.user) {
    const roomResult = await pool.query<{ roomId: string }>(
      `
        SELECT cp."roomId"
        FROM "ChatParticipant" cp
        JOIN "User" u ON u.id = cp."userId"
        JOIN "ChatRoom" cr ON cr.id = cp."roomId"
        WHERE cp."userId" = $1 OR lower(u.email) = lower($1)
        ORDER BY cr."updatedAt" DESC
        LIMIT 1
      `,
      [options.user]
    )

    if (roomResult.rows[0]) {
      return {
        roomId: roomResult.rows[0].roomId,
        reason: `latest room for user ${options.user}`
      }
    }

    return null
  }

  const latestRoomResult = await pool.query<{ id: string }>(
    'SELECT id FROM "ChatRoom" ORDER BY "updatedAt" DESC LIMIT 1'
  )

  if (!latestRoomResult.rows[0]) {
    return null
  }

  return {
    roomId: latestRoomResult.rows[0].id,
    reason: 'latest updated room'
  }
}

async function loadChatroomReport(
  pool: pg.Pool,
  roomId: string,
  turnLimit: number,
  messageLimit: number
) {
  const roomResult = await pool.query<ChatRoomRow>(
    'SELECT id, name, "createdAt", "updatedAt" FROM "ChatRoom" WHERE id = $1 LIMIT 1',
    [roomId]
  )
  const room = roomResult.rows[0]

  if (!room) {
    return null
  }

  const participantsResult = await pool.query<ParticipantRow>(
    `
      SELECT cp."userId", u.email, u.name
      FROM "ChatParticipant" cp
      JOIN "User" u ON u.id = cp."userId"
      WHERE cp."roomId" = $1
      ORDER BY cp."lastSeen" DESC NULLS LAST, cp."userId" ASC
    `,
    [roomId]
  )

  const turnsResult = await pool.query<TurnRow>(
    `
      SELECT
        id,
        "roomId",
        "userMessageId",
        "assistantMessageId",
        status,
        "failureReason",
        "createdAt",
        "startedAt",
        "finishedAt",
        "lastHeartbeatAt",
        metadata
      FROM "ChatTurn"
      WHERE "roomId" = $1
      ORDER BY "createdAt" DESC, id DESC
      LIMIT $2
    `,
    [roomId, turnLimit]
  )

  const turns = [...turnsResult.rows].reverse()
  const turnIds = turns.map((turn) => turn.id)

  const messagesResult = await pool.query<MessageRow>(
    `
      SELECT id, "roomId", "turnId", "senderId", content, "createdAt", "updatedAt", metadata
      FROM "ChatMessage"
      WHERE "roomId" = $1
      ORDER BY "createdAt" DESC, id DESC
      LIMIT $2
    `,
    [roomId, messageLimit]
  )

  const recentMessages = [...messagesResult.rows].reverse()

  const turnMessagesResult = turnIds.length
    ? await pool.query<MessageRow>(
        `
          SELECT id, "roomId", "turnId", "senderId", content, "createdAt", "updatedAt", metadata
          FROM "ChatMessage"
          WHERE "turnId" = ANY($1::text[])
          ORDER BY "createdAt" ASC, id ASC
        `,
        [turnIds]
      )
    : { rows: [] as MessageRow[] }

  const eventsResult = turnIds.length
    ? await pool.query<EventRow>(
        `
          SELECT id, "turnId", type, data, "createdAt"
          FROM "ChatTurnEvent"
          WHERE "turnId" = ANY($1::text[])
          ORDER BY "createdAt" ASC, id ASC
        `,
        [turnIds]
      )
    : { rows: [] as EventRow[] }

  const toolsResult = turnIds.length
    ? await pool.query<ToolExecutionRow>(
        `
          SELECT id, "turnId", "toolName", status, result, error, metadata, "createdAt", "updatedAt"
          FROM "ChatTurnToolExecution"
          WHERE "turnId" = ANY($1::text[])
          ORDER BY "createdAt" ASC, id ASC
        `,
        [turnIds]
      )
    : { rows: [] as ToolExecutionRow[] }

  const messagesByTurn = new Map<string, MessageRow[]>()
  turnMessagesResult.rows.forEach((message) => {
    if (!message.turnId) return
    messagesByTurn.set(message.turnId, [...(messagesByTurn.get(message.turnId) || []), message])
  })

  const eventsByTurn = new Map<string, EventRow[]>()
  eventsResult.rows.forEach((event) => {
    eventsByTurn.set(event.turnId, [...(eventsByTurn.get(event.turnId) || []), event])
  })

  const toolsByTurn = new Map<string, ToolExecutionRow[]>()
  toolsResult.rows.forEach((tool) => {
    toolsByTurn.set(tool.turnId, [...(toolsByTurn.get(tool.turnId) || []), tool])
  })

  const turnReports = turns.map((turn) => {
    const messages = messagesByTurn.get(turn.id) || []
    const events = eventsByTurn.get(turn.id) || []
    const tools = toolsByTurn.get(turn.id) || []
    const findings = buildTurnFindings(turn, messages, events, tools)

    return {
      turn,
      messages,
      events,
      tools,
      findings
    }
  })

  return {
    room,
    participants: participantsResult.rows,
    recentMessages,
    turnReports
  }
}

function printTurnReport(report: ReturnType<typeof buildTurnFindings> extends never ? never : any) {
  const { turn, messages, events, tools, findings } = report as {
    turn: TurnRow
    messages: MessageRow[]
    events: EventRow[]
    tools: ToolExecutionRow[]
    findings: TurnFinding[]
  }

  const skillSelection = getSkillSelection(turn.metadata)
  const userMessage = messages.find((message) => message.id === turn.userMessageId)
  const assistantMessage = turn.assistantMessageId
    ? messages.find((message) => message.id === turn.assistantMessageId)
    : messages.find((message) => message.senderId === 'ai_agent')
  const statusColor =
    turn.status === 'COMPLETED'
      ? chalk.green
      : turn.status === 'INTERRUPTED' || turn.status === 'FAILED'
        ? chalk.red
        : chalk.yellow

  console.log(
    statusColor(
      `\n[${turn.status}] ${turn.id}  created=${formatTimestamp(turn.createdAt)} finished=${formatTimestamp(turn.finishedAt)}`
    )
  )
  console.log(
    chalk.gray(
      `  skill=${skillSelection?.skillIds?.join(', ') || 'n/a'} useTools=${skillSelection?.useTools ? 'yes' : 'no'} source=${skillSelection?.source || 'n/a'}`
    )
  )
  if (turn.failureReason) {
    console.log(chalk.red(`  failureReason=${turn.failureReason}`))
  }
  console.log(chalk.gray(`  user: ${formatSnippet(userMessage?.content)}`))
  console.log(chalk.gray(`  assistant: ${formatSnippet(assistantMessage?.content)}`))

  if (tools.length > 0) {
    console.log(
      chalk.cyan(
        `  tools (${tools.length}): ${tools.map((tool) => `${tool.toolName}:${tool.status}`).join(', ')}`
      )
    )
  } else {
    console.log(chalk.gray('  tools: none'))
  }

  if (events.length > 0) {
    console.log(chalk.gray('  events:'))
    events.slice(-6).forEach((event) => {
      console.log(chalk.gray(`    - ${summarizeEvent(event)}`))
    })
  }

  if (findings.length > 0) {
    console.log(chalk.yellow('  findings:'))
    findings.forEach((finding) => {
      const color =
        finding.severity === 'high'
          ? chalk.red
          : finding.severity === 'medium'
            ? chalk.yellow
            : chalk.blue
      console.log(color(`    - [${finding.severity}] ${finding.code}: ${finding.detail}`))
    })
  }
}

const chatroomCommand = new Command('chatroom')
  .description('Inspect the latest or a specific chat room with turn and tool diagnostics')
  .argument('[roomId]', 'Chat room ID to inspect')
  .option('--room <id>', 'Explicit room ID to inspect')
  .option('--turn <id>', 'Resolve the room from a turn ID')
  .option('--user <emailOrId>', 'Inspect the latest room for a specific user')
  .option('-l, --limit <number>', 'Number of recent turns to include', String(DEFAULT_RECENT_TURNS))
  .option(
    '-m, --messages <number>',
    'Number of recent room messages to include in the summary',
    String(DEFAULT_RECENT_MESSAGES)
  )
  .option('--prod', 'Use production database')
  .option('--json', 'Output JSON instead of human-readable text')
  .action(async (roomIdArg: string | undefined, options) => {
    const isProd = !!options.prod
    const connectionString = getConnectionString(isProd)

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })

    try {
      if (!options.json) {
        console.log(
          chalk.yellow(isProd ? 'Using PRODUCTION database.' : 'Using DEVELOPMENT database.')
        )
      }

      const target = await resolveTargetRoom(pool, roomIdArg, options)
      if (!target) {
        console.error(chalk.red('No matching chat room found for the requested selector.'))
        process.exit(1)
      }

      const report = await loadChatroomReport(
        pool,
        target.roomId,
        parseInteger(options.limit, DEFAULT_RECENT_TURNS),
        parseInteger(options.messages, DEFAULT_RECENT_MESSAGES)
      )

      if (!report) {
        console.error(chalk.red(`Chat room ${target.roomId} was not found.`))
        process.exit(1)
      }

      const aggregateFindings = report.turnReports.flatMap((entry) => entry.findings)
      const latestTurn = report.turnReports[report.turnReports.length - 1] || null

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              environment: isProd ? 'production' : 'development',
              selectedBy: target.reason,
              room: report.room,
              participants: report.participants,
              latestTurnId: latestTurn?.turn.id || null,
              findings: aggregateFindings,
              recentMessages: report.recentMessages.map((message) => ({
                id: message.id,
                role: getMessageRole(message.senderId),
                senderId: message.senderId,
                turnId: message.turnId,
                createdAt: message.createdAt,
                content: message.content,
                metadata: message.metadata
              })),
              turns: report.turnReports
            },
            null,
            2
          )
        )
        return
      }

      console.log(
        chalk.bold.blue(`\nChat Room ${report.room.id} (${report.room.name || 'Untitled'})`)
      )
      console.log(chalk.gray(`Selected by: ${target.reason}`))
      console.log(
        chalk.gray(
          `Created=${formatTimestamp(report.room.createdAt)} Updated=${formatTimestamp(report.room.updatedAt)}`
        )
      )
      console.log(
        chalk.gray(
          `Participants: ${report.participants.map((participant) => participant.name || participant.email || participant.userId).join(', ') || 'none'}`
        )
      )
      console.log(
        chalk.gray(
          `Recent turns=${report.turnReports.length} Recent messages=${report.recentMessages.length} Findings=${aggregateFindings.length}`
        )
      )

      if (aggregateFindings.length > 0) {
        console.log(chalk.yellow('\nTop Findings'))
        aggregateFindings.forEach((finding, index) => {
          const color =
            finding.severity === 'high'
              ? chalk.red
              : finding.severity === 'medium'
                ? chalk.yellow
                : chalk.blue
          console.log(
            color(`  ${index + 1}. [${finding.severity}] ${finding.code}: ${finding.detail}`)
          )
        })
      }

      console.log(chalk.blue('\nRecent Turns'))
      report.turnReports.forEach((turnReport) => {
        printTurnReport(turnReport)
      })

      console.log(chalk.blue('\nRecent Room Messages'))
      report.recentMessages.forEach((message) => {
        console.log(
          chalk.gray(
            `  [${formatTimestamp(message.createdAt)}] ${getMessageRole(message.senderId)} ${message.id} turn=${message.turnId || 'n/a'} :: ${formatSnippet(message.content, 120)}`
          )
        )
      })
    } catch (error: any) {
      console.error(chalk.red('Fatal error while inspecting chat room:'), error?.message || error)
      process.exitCode = 1
    } finally {
      await pool.end()
    }
  })

export default chatroomCommand
