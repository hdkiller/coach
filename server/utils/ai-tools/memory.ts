import { tool } from 'ai'
import { z } from 'zod'
import { buildMemoryCandidate, userMemoryService } from '../services/userMemoryService'

const memoryScopeSchema = z.enum(['GLOBAL', 'ROOM'])
const memoryCategorySchema = z.enum([
  'PREFERENCE',
  'GOAL',
  'CONSTRAINT',
  'PROFILE',
  'COMMUNICATION',
  'TEMPORARY'
])

export const memoryTools = (userId: string, chatRoomId?: string) => ({
  list_memories: tool({
    description:
      'List saved memories for the user. Use this to review, inspect, or confirm what is remembered across chats or in the current room.',
    inputSchema: z.object({
      scope: memoryScopeSchema.optional().describe('Filter to GLOBAL or ROOM memories.')
    }),
    execute: async ({ scope }) => {
      const memories = await userMemoryService.listMemories({
        userId,
        ...(scope ? { scope } : {}),
        ...(scope === 'ROOM' ? { roomId: chatRoomId || null } : {})
      })

      return {
        count: memories.length,
        memories: memories.map((memory) => ({
          id: memory.id,
          scope: memory.scope,
          category: memory.category,
          content: memory.content,
          source: memory.source,
          sensitive: memory.sensitive,
          pinned: memory.pinned,
          updatedAt: memory.updatedAt
        }))
      }
    }
  }),

  remember_memory: tool({
    description:
      'Save a memory explicitly. Use this when the user asks you to remember something for future chats or for this room.',
    inputSchema: z.object({
      content: z.string().min(1).max(600),
      scope: memoryScopeSchema.default('GLOBAL'),
      category: memoryCategorySchema.optional(),
      sensitive: z.boolean().optional(),
      pinned: z.boolean().optional()
    }),
    execute: async ({ content, scope, category, sensitive, pinned }) => {
      const result = await userMemoryService.saveMemory(
        userId,
        buildMemoryCandidate({
          content,
          scope,
          roomId: scope === 'ROOM' ? chatRoomId || null : null,
          category,
          sensitive,
          pinned,
          source: 'USER_EXPLICIT',
          confidence: 1,
          metadata: {
            createdFrom: 'memory_tool'
          }
        }),
        { touchConfirmedAt: true }
      )

      return {
        success: true,
        action: result.created ? 'created' : 'updated',
        memory: {
          id: result.memory.id,
          scope: result.memory.scope,
          category: result.memory.category,
          content: result.memory.content,
          sensitive: result.memory.sensitive,
          pinned: result.memory.pinned
        }
      }
    }
  }),

  forget_memory: tool({
    description:
      'Forget or archive a saved memory. Use this when the user asks you to forget something that was previously remembered.',
    inputSchema: z.object({
      memoryId: z.string().optional(),
      content: z.string().optional().describe('Natural-language memory text to match against.')
    }),
    execute: async ({ memoryId, content }) => {
      if (memoryId) {
        const memory = await userMemoryService.updateMemory(userId, memoryId, {
          status: 'ARCHIVED'
        })
        return {
          success: true,
          status: 'archived',
          memory
        }
      }

      if (!content?.trim()) {
        return {
          success: false,
          error: 'Either memoryId or content is required.'
        }
      }

      const result = await userMemoryService.forgetByContent({
        userId,
        content,
        roomId: chatRoomId || null
      })

      return {
        success: result.status === 'archived',
        status: result.status,
        matches: result.matches.map((memory) => ({
          id: memory.id,
          content: memory.content,
          scope: memory.scope
        }))
      }
    }
  }),

  update_memory: tool({
    description:
      'Update an existing saved memory, including content, scope, category, pinned state, or sensitivity.',
    inputSchema: z.object({
      memoryId: z.string(),
      content: z.string().optional(),
      scope: memoryScopeSchema.optional(),
      category: memoryCategorySchema.optional(),
      sensitive: z.boolean().optional(),
      pinned: z.boolean().optional()
    }),
    execute: async ({ memoryId, content, scope, category, sensitive, pinned }) => {
      const memory = await userMemoryService.updateMemory(userId, memoryId, {
        ...(content ? { content } : {}),
        ...(scope ? { scope, roomId: scope === 'ROOM' ? chatRoomId || null : null } : {}),
        ...(category ? { category } : {}),
        ...(typeof sensitive === 'boolean' ? { sensitive } : {}),
        ...(typeof pinned === 'boolean' ? { pinned } : {}),
        source: 'USER_EXPLICIT'
      })

      return {
        success: true,
        memory
      }
    }
  })
})
