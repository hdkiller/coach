import { defineWebSocketHandler } from 'h3'
import { runs } from '@trigger.dev/sdk/v3'
import { verifyWsToken } from '../utils/ws-auth'
import { buildAthleteContext } from '../utils/services/chatContextService'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { chatToolDeclarations, executeToolCall } from '../utils/chat-tools'
import { prisma } from '../utils/db'
import { generateCoachAnalysis } from '../utils/gemini'

// Map to store active subscriptions cancel functions per peer
const subscriptions = new Map<any, Set<() => void>>()
// Map to store peer authentication status
const peerContext = new Map<any, { userId?: string }>()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MODEL_NAMES = {
  flash: 'gemini-flash-latest',
  pro: 'gemini-pro-latest'
} as const

export default defineWebSocketHandler({
  open(peer) {
    peer.send(JSON.stringify({ type: 'welcome', message: 'Connected to Coach Watts WebSocket' }))
    subscriptions.set(peer, new Set())
    peerContext.set(peer, {})
  },

  async message(peer, message) {
    const text = message.text()

    if (text === 'ping') {
      peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      return
    }

    try {
      const data = JSON.parse(text)

      // Handle Authentication
      if (data.type === 'authenticate') {
        const userId = verifyWsToken(data.token)
        if (userId) {
          const ctx = peerContext.get(peer) || {}
          ctx.userId = userId
          peerContext.set(peer, ctx)
          peer.send(JSON.stringify({ type: 'authenticated', userId }))
        } else {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token'
            })
          )
        }
        return
      }

      if (data.type === 'subscribe_run') {
        const runId = data.runId
        if (!runId) return

        startSubscription(peer, () => runs.subscribeToRun(runId), runId)
      }

      if (data.type === 'subscribe_user') {
        // Enforce Authentication
        const ctx = peerContext.get(peer)
        if (!ctx?.userId) {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            })
          )
          return
        }

        // Use the authenticated user ID, ignore payload to prevent snooping
        const userId = ctx.userId
        const tag = `user:${userId}`
        startSubscription(peer, () => runs.subscribeToRunsWithTag(tag), `tag:${tag}`)
      }

      // Handle Chat Message
      if (data.type === 'chat_message') {
        const ctx = peerContext.get(peer)
        if (!ctx?.userId) {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required for chat'
            })
          )
          return
        }

        const { roomId, content, replyMessage } = data
        if (!roomId || !content) return

        await handleChatMessage(peer, ctx.userId, roomId, content, replyMessage)
      }
    } catch (e) {
      // Ignore JSON parse errors
      console.error('WebSocket message error:', e)
    }
  },

  close(peer, event) {
    const peerSubs = subscriptions.get(peer)
    if (peerSubs) {
      peerSubs.forEach((cancel) => cancel())
      subscriptions.delete(peer)
    }
    peerContext.delete(peer)
  },

  error(peer, error) {
    // WebSocket error
  }
})

// Helper to handle subscription loops
function startSubscription(peer: any, iteratorFn: () => AsyncIterable<any>, subId: string) {
  let isSubscribed = true
  const cancel = () => {
    isSubscribed = false
  }

  const peerSubs = subscriptions.get(peer)
  if (peerSubs) peerSubs.add(cancel)
  ;(async () => {
    try {
      for await (const run of iteratorFn()) {
        if (!isSubscribed) break

        peer.send(
          JSON.stringify({
            type: 'run_update',
            runId: run.id,
            taskIdentifier: run.taskIdentifier,
            status: run.status,
            output: run.output,
            error: run.error,
            tags: run.tags,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt
          })
        )
      }
    } catch (err) {
      // Subscription error
    } finally {
      if (peerSubs) peerSubs.delete(cancel)
    }
  })()
}

// Chat Message Handler with Streaming
async function handleChatMessage(
  peer: any,
  userId: string,
  roomId: string,
  content: string,
  replyMessage?: any
) {
  try {
    // 1. Save User Message (async)
    const userMessage = await prisma.chatMessage.create({
      data: {
        content,
        roomId,
        senderId: userId,
        replyToId: replyMessage?._id || undefined,
        seen: { [userId]: new Date() }
      }
    })

    // Notify client that message was saved
    peer.send(
      JSON.stringify({
        type: 'chat_message_saved',
        roomId,
        messageId: userMessage.id,
        content: userMessage.content,
        createdAt: userMessage.createdAt
      })
    )

    // 2. Build Context
    const { userProfile, systemInstruction } = await buildAthleteContext(userId)

    // 3. Fetch History
    const history = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    const chronologicalHistory = history.reverse()

    // 4. Prepare History for Model
    let historyForModel = chronologicalHistory.map((msg: any) => ({
      role: msg.senderId === 'ai_agent' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Remove leading model messages
    while (
      historyForModel.length > 0 &&
      historyForModel[0] &&
      historyForModel[0].role === 'model'
    ) {
      historyForModel = historyForModel.slice(1)
    }

    // 5. Initialize Model
    const modelName =
      userProfile?.aiModelPreference === 'flash' ? MODEL_NAMES.flash : MODEL_NAMES.pro
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      tools: [{ functionDeclarations: chatToolDeclarations }]
    })

    const chat = model.startChat({ history: historyForModel })

    // 6. Send Message & Stream Loop
    let roundCount = 0
    const MAX_ROUNDS = 5
    const toolCallsUsed: Array<{ name: string; args: any; response: any; timestamp: string }> = []
    let fullResponseText = ''
    let isComplete = false

    // Initial message payload
    let messagePayload: any = content

    while (roundCount < MAX_ROUNDS && !isComplete) {
      // Send message stream
      const result = await chat.sendMessageStream(messagePayload)
      let chunkText = ''

      // Iterate chunks
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          chunkText += text
          fullResponseText += text
          // Stream token to client
          peer.send(
            JSON.stringify({
              type: 'chat_token',
              roomId,
              text
            })
          )
        }
      }

      // Wait for stream to fully complete to check for function calls in the aggregated response
      const response = await result.response
      const functionCalls = response.functionCalls()

      if (functionCalls && functionCalls.length > 0) {
        roundCount++
        console.log(
          `[WS Chat] Round ${roundCount}: Processing ${functionCalls.length} function calls`
        )

        // Notify client about tool execution
        peer.send(
          JSON.stringify({
            type: 'tool_start',
            roomId,
            tools: functionCalls.map((fc) => fc.name)
          })
        )

        // Execute tools
        const functionResponses = await Promise.all(
          functionCalls.map(async (call) => {
            const callTimestamp = new Date().toISOString()
            try {
              const toolResult = await executeToolCall(call.name, call.args, userId)

              // Store metadata
              toolCallsUsed.push({
                name: call.name,
                args: call.args,
                response: toolResult,
                timestamp: callTimestamp
              })

              return {
                functionResponse: {
                  name: call.name,
                  response: toolResult
                }
              }
            } catch (err: any) {
              const errorResponse = { error: err.message || 'Unknown error' }
              toolCallsUsed.push({
                name: call.name,
                args: call.args,
                response: errorResponse,
                timestamp: callTimestamp
              })
              return {
                functionResponse: {
                  name: call.name,
                  response: errorResponse
                }
              }
            }
          })
        )

        // Notify client tool execution finished (optional, or just implied by next token)
        peer.send(JSON.stringify({ type: 'tool_end', roomId }))

        // Set payload for next iteration (sending function responses back)
        messagePayload = functionResponses
      } else {
        // No function calls, we are done
        isComplete = true
      }
    }

    // 7. Save AI Response
    const aiMessage = await prisma.chatMessage.create({
      data: {
        content: fullResponseText,
        roomId,
        senderId: 'ai_agent',
        seen: {}
      }
    })

    // 8. Extract Charts & Metadata
    const chartToolCalls = toolCallsUsed.filter((t) => t.name === 'create_chart')
    const charts = chartToolCalls.map((call, index) => ({
      id: `chart-${aiMessage.id}-${index}`,
      ...call.args
    }))

    if (charts.length > 0 || toolCallsUsed.length > 0) {
      await prisma.chatMessage.update({
        where: { id: aiMessage.id },
        data: {
          metadata: {
            charts,
            toolCalls: toolCallsUsed,
            toolsUsed: toolCallsUsed.map((t) => t.name),
            toolCallCount: toolCallsUsed.length
          } as any
        }
      })
    }

    // 9. Send Completion Event
    peer.send(
      JSON.stringify({
        type: 'chat_complete',
        roomId,
        messageId: aiMessage.id,
        content: fullResponseText,
        metadata: {
          charts,
          toolCalls: toolCallsUsed
        }
      })
    )

    // 10. Auto-rename room (same logic as before)
    const messageCount = await prisma.chatMessage.count({ where: { roomId } })
    if (messageCount === 2) {
      const titlePrompt = `Based on this conversation, generate a very concise, descriptive title (max 6 words). Just return the title, nothing else.

User: ${content}
AI: ${fullResponseText.substring(0, 500)}

Title:`
      try {
        let roomTitle = await generateCoachAnalysis(titlePrompt, 'flash', {
          userId,
          operation: 'chat_title_generation',
          entityType: 'ChatRoom',
          entityId: roomId
        })
        roomTitle = roomTitle
          .trim()
          .replace(/^["']|["']$/g, '')
          .substring(0, 60)
        await prisma.chatRoom.update({ where: { id: roomId }, data: { name: roomTitle } })

        // Notify client of rename
        peer.send(JSON.stringify({ type: 'room_renamed', roomId, name: roomTitle }))
      } catch (e) {
        // Ignore rename errors
      }
    }
  } catch (error: any) {
    console.error('[WS Chat] Error:', error)
    peer.send(
      JSON.stringify({
        type: 'error',
        roomId,
        code: 'CHAT_ERROR',
        message: error.message || 'An error occurred during chat processing'
      })
    )
  }
}
