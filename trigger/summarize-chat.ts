import { logger, task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { calculateLlmCost } from '../server/utils/ai-config'

export const summarizeChatTask = task({
  id: 'summarize-chat',
  run: async (payload: { roomId: string; userId: string; forceRename?: boolean }) => {
    const { roomId, userId, forceRename } = payload

    logger.info(`Starting processing for room ${roomId}`)

    // 0. Fetch Room Data
    const roomData = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { name: true, metadata: true }
    })

    if (!roomData) {
      logger.error(`Room ${roomId} not found`)
      return { success: false, reason: 'room_not_found' }
    }

    const metadata = (roomData.metadata as any) || {}
    const lastId = metadata.lastSummarizedMessageId

    // 1. Fetch NEW messages for the room (after the last summarized one)
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(lastId
          ? {
              createdAt: {
                gt: (
                  await prisma.chatMessage.findUnique({
                    where: { id: lastId },
                    select: { createdAt: true }
                  })
                )?.createdAt
              }
            }
          : {})
      },
      orderBy: { createdAt: 'asc' },
      take: 50 // Process next chunk
    })

    const shouldRename = forceRename || !roomData.name || roomData.name === 'New Chat'

    if (messages.length < 5 && !lastId) {
      if (!shouldRename) {
        logger.info(`Not enough messages to start summarization in room ${roomId}`)
        return { success: false, reason: 'too_few_messages' }
      }
      logger.info(
        `Chat is new or forceRename requested, proceeding with rename (messages: ${messages.length})`
      )
    }

    if (messages.length === 0) {
      logger.info(`No new messages to process in room ${roomId}`)
      return { success: true, reason: 'up_to_date' }
    }

    // 2. Format messages for the AI
    const conversationText = messages
      .map((m) => {
        const role = m.senderId === 'ai_agent' ? 'Assistant' : 'User'
        return `${role}: ${m.content}`
      })
      .join('\n\n')

    // 3. Call AI to summarize and potentially rename
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY
    })

    const existingSummary = metadata.historySummary || ''
    let summary = existingSummary
    let summarizedNewMessages = false

    // Only summarize if we have enough messages or a previous summary history
    if (messages.length >= 5 || lastId) {
      logger.info(`Generating summary for ${messages.length} messages`)
      const { text: newSummary, usage: summaryUsage } = await generateText({
        model: google('gemini-flash-lite-latest'),
        system: `You are an expert at condensing training conversations. 
        Summarize the chat between an athlete and their AI coach.
        ${existingSummary ? `IMPORTANT: Here is the PREVIOUS summary of earlier parts of this conversation: "${existingSummary}". Incorporate its key points into the new summary so no vital context is lost.` : ''}
        Focus on: Key achievements, current injuries/pains, recent workout feedback, and any specific goals discussed. Keep it under 250 words.`,
        prompt: `NEW MESSAGES IN CONVERSATION:\n${conversationText}`
      })

      summary = newSummary
      summarizedNewMessages = true

      // Log Summary Usage
      await prisma.llmUsage.create({
        data: {
          userId,
          provider: 'google',
          model: 'gemini-flash-lite-latest',
          operation: 'summarize-chat',
          entityType: 'ChatRoom',
          entityId: roomId,
          promptTokens: summaryUsage.inputTokens || 0,
          completionTokens: summaryUsage.outputTokens || 0,
          totalTokens: (summaryUsage.inputTokens || 0) + (summaryUsage.outputTokens || 0),
          estimatedCost: calculateLlmCost(
            'gemini-flash-lite-latest',
            summaryUsage.inputTokens || 0,
            summaryUsage.outputTokens || 0
          ),
          success: true
        }
      })
    }

    let newTitle = null
    if (shouldRename) {
      logger.info(`Generating title for room ${roomId}`)
      const { text: title, usage: titleUsage } = await generateText({
        model: google('gemini-flash-lite-latest'),
        system:
          'Generate a 2-4 word catchy title for this conversation based on the user prompt. No quotes, just the title.',
        prompt: conversationText
      })
      newTitle = title.trim().replace(/^"|"$/g, '')

      // Log Title Usage
      await prisma.llmUsage.create({
        data: {
          userId,
          provider: 'google',
          model: 'gemini-flash-lite-latest',
          operation: 'rename-chat',
          entityType: 'ChatRoom',
          entityId: roomId,
          promptTokens: titleUsage.inputTokens || 0,
          completionTokens: titleUsage.outputTokens || 0,
          totalTokens: (titleUsage.inputTokens || 0) + (titleUsage.outputTokens || 0),
          estimatedCost: calculateLlmCost(
            'gemini-flash-lite-latest',
            titleUsage.inputTokens || 0,
            titleUsage.outputTokens || 0
          ),
          success: true
        }
      })
    }

    // 4. Update ChatRoom metadata and name
    if (summarizedNewMessages) {
      metadata.historySummary = summary
      const lastMsg = messages[messages.length - 1]
      if (lastMsg) {
        metadata.lastSummarizedMessageId = lastMsg.id
      }
      metadata.summarizedCount = (metadata.summarizedCount || 0) + messages.length
    }

    await prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        metadata,
        name: newTitle || undefined
      }
    })

    logger.info(`Successfully processed room ${roomId}`)
    return { success: true, summary, newTitle }
  }
})
