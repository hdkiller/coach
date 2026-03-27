import { prisma } from '../db'
import {
  buildToolIdempotencyKey,
  CHAT_TOOL_EXECUTION_STATUS,
  CHAT_TURN_EVENT_TYPE,
  hashToolArgs,
  isMutatingChatTool,
  type ChatToolExecutionContext
} from './turns'
import { toPrismaNullableJsonValue } from '../prisma-json'

type ToolLike = {
  execute?: (args: any, options: any) => Promise<any> | any
}

export function wrapChatToolsForExecution(
  tools: Record<string, ToolLike>,
  fallbackContext?: Partial<ChatToolExecutionContext>
) {
  const wrapped: Record<string, ToolLike> = {}

  for (const [toolName, toolDef] of Object.entries(tools)) {
    if (typeof toolDef?.execute !== 'function') {
      wrapped[toolName] = toolDef
      continue
    }

    wrapped[toolName] = {
      ...toolDef,
      execute: async (args: any, options: any) => {
        const runtimeContext = (options?.experimental_context ||
          {}) as Partial<ChatToolExecutionContext>
        const context = {
          ...fallbackContext,
          ...runtimeContext
        } as Partial<ChatToolExecutionContext>

        if (!context.turnId || !context.lineageId) {
          return await toolDef.execute?.(args, options)
        }

        const argsHash = hashToolArgs(args)
        const idempotencyKey = buildToolIdempotencyKey(context.lineageId, toolName, argsHash)

        const existingSameCall = await prisma.chatTurnToolExecution
          .findUnique({
            where: {
              turnId_toolCallId: {
                turnId: context.turnId,
                toolCallId: options.toolCallId
              }
            }
          })
          .catch(() => null)

        if (existingSameCall?.status === CHAT_TOOL_EXECUTION_STATUS.COMPLETED) {
          return existingSameCall.result
        }

        if (isMutatingChatTool(toolName)) {
          const completedExecution = await prisma.chatTurnToolExecution.findFirst({
            where: {
              lineageId: context.lineageId,
              toolName,
              argsHash,
              status: CHAT_TOOL_EXECUTION_STATUS.COMPLETED
            },
            orderBy: { createdAt: 'asc' }
          })

          if (completedExecution) {
            await prisma.chatTurnToolExecution.upsert({
              where: {
                turnId_toolCallId: {
                  turnId: context.turnId,
                  toolCallId: options.toolCallId
                }
              },
              update: {
                status: CHAT_TOOL_EXECUTION_STATUS.COMPLETED,
                result: toPrismaNullableJsonValue(completedExecution.result),
                error: null,
                metadata: {
                  cachedResult: true,
                  cachedFromExecutionId: completedExecution.id
                } as any
              },
              create: {
                turnId: context.turnId,
                lineageId: context.lineageId,
                toolCallId: options.toolCallId,
                toolName,
                argsHash,
                idempotencyKey,
                status: CHAT_TOOL_EXECUTION_STATUS.COMPLETED,
                result: toPrismaNullableJsonValue(completedExecution.result),
                metadata: {
                  cachedResult: true,
                  cachedFromExecutionId: completedExecution.id
                } as any
              }
            })

            await prisma.chatTurnEvent.create({
              data: {
                turnId: context.turnId,
                type: CHAT_TURN_EVENT_TYPE.TOOL_CALL_COMPLETED,
                data: {
                  toolCallId: options.toolCallId,
                  toolName,
                  cachedResult: true
                } as any
              }
            })

            return completedExecution.result
          }
        }

        await prisma.chatTurnToolExecution.upsert({
          where: {
            turnId_toolCallId: {
              turnId: context.turnId,
              toolCallId: options.toolCallId
            }
          },
          update: {
            toolName,
            argsHash,
            idempotencyKey,
            status: CHAT_TOOL_EXECUTION_STATUS.STARTED,
            error: null,
            metadata: {
              args: toPrismaNullableJsonValue(args)
            } as any
          },
          create: {
            turnId: context.turnId,
            lineageId: context.lineageId,
            toolCallId: options.toolCallId,
            toolName,
            argsHash,
            idempotencyKey,
            status: CHAT_TOOL_EXECUTION_STATUS.STARTED,
            metadata: {
              args: toPrismaNullableJsonValue(args)
            } as any
          }
        })

        await prisma.chatTurnEvent.create({
          data: {
            turnId: context.turnId,
            type: CHAT_TURN_EVENT_TYPE.TOOL_CALL_STARTED,
            data: {
              toolCallId: options.toolCallId,
              toolName
            } as any
          }
        })

        try {
          const result = await toolDef.execute?.(args, options)
          const jsonResult = toPrismaNullableJsonValue(result)

          await prisma.chatTurnToolExecution.update({
            where: {
              turnId_toolCallId: {
                turnId: context.turnId,
                toolCallId: options.toolCallId
              }
            },
            data: {
              status: CHAT_TOOL_EXECUTION_STATUS.COMPLETED,
              result: jsonResult,
              error: null
            }
          })

          await prisma.chatTurnEvent.create({
            data: {
              turnId: context.turnId,
              type: CHAT_TURN_EVENT_TYPE.TOOL_CALL_COMPLETED,
              data: {
                toolCallId: options.toolCallId,
                toolName
              } as any
            }
          })

          return result
        } catch (error: any) {
          await prisma.chatTurnToolExecution.update({
            where: {
              turnId_toolCallId: {
                turnId: context.turnId,
                toolCallId: options.toolCallId
              }
            },
            data: {
              status: CHAT_TOOL_EXECUTION_STATUS.FAILED,
              error: error?.message || 'Tool execution failed'
            }
          })

          await prisma.chatTurnEvent.create({
            data: {
              turnId: context.turnId,
              type: CHAT_TURN_EVENT_TYPE.TOOL_CALL_FAILED,
              data: {
                toolCallId: options.toolCallId,
                toolName,
                error: error?.message || 'Tool execution failed'
              } as any
            }
          })

          throw error
        }
      }
    }
  }

  return wrapped
}
