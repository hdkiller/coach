import { getServerSession } from '../../utils/session'
import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getToolsWithContext } from '../../utils/ai-tools'
import { generateCoachAnalysis, MODEL_NAMES } from '../../utils/gemini'
import { buildAthleteContext } from '../../utils/services/chatContextService'
import { prisma } from '../../utils/db'
import { getUserTimezone } from '../../utils/date'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }

  const body = await readBody(event)
  const { roomId, messages, files, replyMessage } = body

  // Vercel AI SDK sends the full conversation history in 'messages'
  // The last message is the new user input
  const lastMessage = messages?.[messages.length - 1]

  let content = lastMessage?.content
  // Handle cases where content might be in parts only (common in newer SDK versions)
  if (!content && Array.isArray(lastMessage?.parts)) {
    content = lastMessage.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('')
  }

  const historyMessages = messages

  // Allow empty content for tool messages (approvals/results)
  if (!roomId || (!content && lastMessage?.role !== 'tool')) {
    throw createError({ statusCode: 400, message: 'Room ID and content required' })
  }

  // 1. Save User/Tool Message to DB if it's not already persisted
  // The AI SDK sends a unique ID for each message. We can use this to prevent duplicates.
  const userMessageId = lastMessage.id

  const existingMessage = userMessageId
    ? await prisma.chatMessage.findUnique({
        where: { id: userMessageId }
      })
    : null

  if (!existingMessage) {
    try {
      const metadata: any = {}

      // If it's a tool message, save the parts/result to metadata
      if (lastMessage.role === 'tool' && Array.isArray(lastMessage.content)) {
        // It comes as content array in the body for tool messages in Vercel AI SDK
        metadata.toolResponse = lastMessage.content
      }

      await prisma.chatMessage.create({
        data: {
          id: userMessageId || undefined,
          content: content || '', // Allow empty string for tool messages
          roomId,
          senderId: lastMessage.role === 'tool' ? 'system_tool' : userId, // Distinguish tool responses
          files: files || undefined,
          replyToId: replyMessage?._id || undefined,
          seen: { [userId]: new Date() },
          metadata
        }
      })
    } catch (err) {
      // If ID collision occurs, it's a duplicate, we can ignore
      console.warn('[Chat] Message save skipped (likely duplicate ID):', userMessageId)
    }
  }

  // 2. Build Athlete Context (Extracted to Service)
  const { userProfile, systemInstruction } = await buildAthleteContext(userId)
  const timezone = await getUserTimezone(userId)

  // 3. Initialize Model and Tools
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
  })
  const modelType = userProfile?.aiModelPreference === 'flash' ? 'flash' : 'pro'
  const modelName = MODEL_NAMES[modelType]
  const tools = getToolsWithContext(userId, timezone)

  // 4. Stream Text
  try {
    const allToolResults: any[] = []

    const result = await streamText({
      model: google(modelName),
      system: systemInstruction,
      messages: await convertToModelMessages(historyMessages),
      tools,
      stopWhen: stepCountIs(5), // Allow multi-step interactions (Agency)
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log(`[Chat API] Step finished. Reason: ${finishReason}`)

        if (toolResults && toolResults.length > 0) {
          // Merge with toolCalls to ensure we have args and toolName
          const detailedResults = toolResults.map((tr) => {
            const call = toolCalls?.find((tc) => tc.toolCallId === tr.toolCallId)
            return {
              ...tr,
              args:
                (tr as any).args ||
                (tr as any).input ||
                (call as any)?.args ||
                (call as any)?.input,
              toolName: tr.toolName || call?.toolName,
              result: (tr as any).result || (tr as any).output // Handle 'output' property from Google provider
            }
          })

          console.log(`[Chat API] Tool results in step: ${detailedResults.length}`)
          detailedResults.forEach((r) => {
            console.log(`[Chat API] Tool result (${r.toolName}):`, JSON.stringify(r, null, 2))
          })
          allToolResults.push(...detailedResults)
        }
      },
      onFinish: async ({ text, toolResults: finalStepResults, usage, finishReason }) => {
        console.log(
          `[Chat API] Stream finished for room ${roomId}. Reason: ${finishReason}. Content length: ${text?.length || 0}`
        )

        // Capture tool approval requests from the final message content
        // result.response is available here via closure
        try {
          const response = await result.response
          const responseMessages = response.messages
          console.log('[Chat API] Response messages count:', responseMessages?.length)
          const lastResponseMessage = responseMessages[responseMessages.length - 1]

          const toolApprovals = []
          if (lastResponseMessage && Array.isArray(lastResponseMessage.content)) {
            lastResponseMessage.content.forEach((part: any) => {
              if (part.type === 'tool-approval-request') {
                console.log('[Chat API] Found approval request:', part.toolCallId)
                toolApprovals.push({
                  toolCallId: part.toolCallId || part.approvalId,
                  name: part.toolCall.toolName,
                  args: part.toolCall.args,
                  timestamp: new Date().toISOString()
                })
              }
            })
          }

          // Ensure we capture results if they only appear in onFinish
          const resultsToSave = allToolResults.length > 0 ? allToolResults : finalStepResults || []

          // 1. Save AI Response to DB
          const aiMessage = await prisma.chatMessage.create({
            data: {
              content: text || '',
              roomId,
              senderId: 'ai_agent',
              seen: {},
              metadata: {
                // Save directly here to ensure it's not missed
                toolApprovals: toolApprovals.length > 0 ? toolApprovals : undefined
              }
            }
          })

          // ... rest of logic (LLM usage, update metadata again if needed) ...

          // 4. Handle tool calls and charts in metadata
          const toolCallsUsed = resultsToSave.map((tr: any) => ({
            toolCallId: tr.toolCallId,
            name: tr.toolName,
            args: tr.args || tr.input,
            response: tr.result || tr.output,
            timestamp: new Date().toISOString()
          }))

          const charts = resultsToSave
            .filter(
              (tr: any) =>
                tr.toolName === 'create_chart' && (tr.result?.success || tr.output?.success)
            )
            .map((tr: any, index: number) => ({
              id: `chart-${aiMessage.id}-${index}`,
              ...tr.args
            }))

          if (charts.length > 0 || toolCallsUsed.length > 0) {
            await prisma.chatMessage.update({
              where: { id: aiMessage.id },
              data: {
                metadata: {
                  charts,
                  toolCalls: toolCallsUsed,
                  toolApprovals: toolApprovals.length > 0 ? toolApprovals : undefined, // Merge
                  toolsUsed: toolCallsUsed.map((t) => t.name),
                  toolCallCount: toolCallsUsed.length
                } as any
              }
            })
          }
        } catch (err) {
          console.error('[Chat API] Error in onFinish:', err)
        }
      }
    })
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('[Chat API] Stream error:', error)
        return 'An error occurred while generating the response.'
      }
    })
  } catch (error: any) {
    console.error('[Chat] Error in streamText:', error)
    throw createError({ statusCode: 500, message: 'Failed to generate response: ' + error.message })
  }
})
