import { prisma } from '../../../utils/db'
import { chatService } from '../../../utils/services/chatService'
import { sendTelegramMessage, sendTelegramAction } from '../../../utils/telegram'
import { generateText } from 'ai'

export default defineEventHandler(async (event) => {
  const secretToken = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    throw createError({ statusCode: 403, message: 'Invalid secret token' })
  }

  const body = await readBody(event)
  const message = body.message

  if (!message || !message.text) return { status: 'ignored' }

  const chatId = message.chat.id.toString()
  const text = message.text

  // 1. Handle Commands
  if (text.startsWith('/start')) {
    const args = text.split(' ')
    if (args.length > 1) {
      const token = args[1]

      // Verify Token
      const shareToken = await prisma.shareToken.findUnique({
        where: { token },
        select: { userId: true, resourceType: true, expiresAt: true }
      })

      if (
        shareToken &&
        shareToken.resourceType === 'TELEGRAM_LINK' &&
        shareToken.expiresAt &&
        new Date() < shareToken.expiresAt
      ) {
        // Create/Update Integration
        await prisma.integration.upsert({
          where: {
            userId_provider: {
              userId: shareToken.userId,
              provider: 'telegram'
            }
          },
          create: {
            userId: shareToken.userId,
            provider: 'telegram',
            externalUserId: chatId,
            accessToken: 'valid', // Placeholder
            ingestWorkouts: false
          },
          update: {
            externalUserId: chatId
          }
        })

        // Cleanup token
        await prisma.shareToken.delete({ where: { token } })

        await sendTelegramMessage(
          chatId,
          "🚴 **Connected!** I'm Coach Watts.\n\nI'm ready to analyze your data and help you crush your goals. Ask me anything about your training, nutrition, or recovery."
        )
        return { status: 'linked' }
      } else {
        await sendTelegramMessage(
          chatId,
          '⚠️ This link has expired or is invalid. Please generate a new one from your Dashboard.'
        )
        return { status: 'invalid_token' }
      }
    } else {
      // Just /start without token
      // Check if already linked
      const existing = await prisma.integration.findFirst({
        where: { provider: 'telegram', externalUserId: chatId }
      })

      if (existing) {
        await sendTelegramMessage(chatId, "Welcome back! I'm ready. ⚡")
      } else {
        await sendTelegramMessage(
          chatId,
          'Welcome to Coach Watts! 🚴\n\nPlease link your account via the Dashboard to start chatting.'
        )
      }
      return { status: 'welcome' }
    }
  }

  // 2. Resolve User
  const integration = await prisma.integration.findFirst({
    where: {
      provider: 'telegram',
      externalUserId: chatId
    }
  })

  if (!integration) {
    await sendTelegramMessage(chatId, 'Please link your account via the Dashboard first.')
    return { status: 'unauthorized' }
  }

  const userId = integration.userId

  // 3. Process Chat
  await sendTelegramAction(chatId, 'typing')

  // Find or Create Chat Room for Telegram
  // We use session-based rooms to avoid large context windows and partition conversations.
  const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000 // 6 hours
  let room = await prisma.chatRoom.findFirst({
    where: {
      users: { some: { userId } },
      name: { startsWith: 'Telegram Chat' }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  const latestMessage = room?.messages[0]
  const lastActivity = latestMessage?.createdAt || room?.createdAt
  const now = new Date()
  const shouldCreateNewRoom =
    !room || (lastActivity && now.getTime() - lastActivity.getTime() > SESSION_TIMEOUT_MS)

  if (shouldCreateNewRoom) {
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    room = await prisma.chatRoom.create({
      data: {
        name: `Telegram Chat (${dateStr} ${timeStr})`,
        users: {
          create: { userId }
        }
      }
    })
  }

  const roomId = room.id

  // Save User Message
  await chatService.saveUserMessage({
    userId,
    roomId,
    content: text,
    role: 'user'
  })

  // Prepare AI
  try {
    const { google, modelName, tools, systemInstruction } = await chatService.prepareAI(userId)

    // Build History (Last 20 messages)
    const history = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const coreMessages = history.reverse().map((m) => ({
      role: m.senderId === 'ai_agent' ? 'assistant' : 'user',
      content: m.content
    }))

    // Generate Response
    let result
    try {
      result = await generateText({
        model: google(modelName),
        system: systemInstruction,
        messages: coreMessages as any,
        tools: tools as any,
        // @ts-expect-error - maxSteps is valid in AI SDK v6 but types are finicky with 'any' tools
        maxSteps: 5 // Allow multi-step tool use
      })
    } catch (llmError: any) {
      console.error('[Telegram] LLM Generation Failed:', llmError)

      // Log failed usage
      await chatService.logLlmUsage({
        userId,
        modelName,
        modelType: 'flash',
        content: text,
        response: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        messageId: 'failed-generation', // No message ID yet
        error: llmError.message || String(llmError)
      } as any) // Cast to any because we're extending the type implicitly here/need to update chatService

      throw llmError // Re-throw to be caught by outer block
    }

    const responseText = result.text

    // Save AI Message
    const aiMsg = await chatService.saveAiMessage({
      roomId,
      content: responseText,
      metadata: {
        source: 'telegram',
        toolCalls: result.toolCalls,
        toolResults: result.toolResults
      }
    })

    // Log Usage
    await chatService.logLlmUsage({
      userId,
      modelName,
      modelType: 'flash', // Assuming flash for now or from prepareAI if exposed
      content: text,
      response: responseText,
      usage: result.usage,
      messageId: aiMsg.id,
      durationMs: 0 // Will fix in next step
    } as any)

    // Send Response
    await sendTelegramMessage(chatId, responseText)
  } catch (error: any) {
    console.error('[Telegram] Chat Error:', error)

    // Only send error message to user, logging is handled in inner try-catch or here if needed
    // But we probably want to log it if it wasn't an LLM error (e.g. preparation error)
    // For now, the plan focused on LLM errors.

    await sendTelegramMessage(chatId, 'I blew a gasket. 💥 Try again in a bit.')
  }

  // Log Webhook
  try {
    await prisma.webhookLog.create({
      data: {
        provider: 'telegram',
        eventType: text.startsWith('/') ? 'command' : 'message',
        payload: body as any,
        status: 'PROCESSED',
        processedAt: new Date()
      }
    })
  } catch (e) {
    console.error('Failed to log webhook', e)
  }

  return { status: 'processed' }
})
