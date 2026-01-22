# Migration Plan: Chat Tool Calling to Vercel AI SDK

## Overview

This plan outlines the steps to migrate the existing manual tool calling implementation in the Chat feature to the [Vercel AI SDK](https://sdk.vercel.ai/docs). This will provide a more robust, standardized, and type-safe way to handle LLM interactions, streaming, and tool execution.

## Goals

1.  **Simplify Backend Logic:** Replace manual tool execution loops and history management with `streamText` and `maxSteps`.
2.  **Type Safety:** Use Zod schemas for tool definitions instead of raw JSON/Google schemas.
3.  **Standardized Streaming:** Leverage the AI SDK's data stream protocol for robust frontend-backend communication.
4.  **Enhanced Frontend:** specific `useChat` composable from `@ai-sdk/vue` to manage chat state.

## Phase 1: Backend Migration (`server/api/chat/messages.post.ts`)

### 1. Dependencies

- Ensure `ai` and `@ai-sdk/google` are installed.
- Ensure `zod` is installed (already present).

### 2. Define Tools with Zod

Create a new utility file `server/utils/ai-tools.ts` to define tools compatible with the Vercel AI SDK.

- **Action:** Convert `chatToolDeclarations` from `server/utils/chat-tools.ts` to the `tools` object format required by the AI SDK.
- **Pattern:**

  ```typescript
  import { tool } from 'ai'
  import { z } from 'zod'
  import { getRecentWorkouts } from './chat-tools' // Import existing logic

  export const aiTools = {
    getRecentWorkouts: tool({
      description: '...',
      parameters: z.object({
        limit: z.number().default(5)
        // ...
      }),
      execute: async ({ limit, type, days }, { context }) => {
        // Reuse existing business logic
        return await getRecentWorkouts(context.userId, context.timezone, limit, type, days)
      }
    })
    // ... migrate all tools
  }
  ```

### 3. Refactor HTTP Endpoint

Rewrite `server/api/chat/messages.post.ts` to use `streamText`.

- **Remove:** Manual `genAI` initialization, manual history construction, `while` loop for tools.
- **Implement:**

  ```typescript
  import { streamText, convertToCoreMessages } from 'ai'
  import { google } from '@ai-sdk/google'

  // ... inside event handler
  const result = await streamText({
    model: google('gemini-1.5-pro'),
    messages: convertToCoreMessages(body.messages), // Standardize history
    tools: aiTools,
    maxSteps: 5, // Replaces the while loop
    onFinish: async ({ usage, finishReason }) => {
      // Handle logging to Prisma (LLMUsage)
      // Handle room auto-renaming
    }
  })

  return result.toDataStreamResponse()
  ```

## Phase 2: Frontend Migration (`app/pages/chat.vue`)

### 1. Adopt `useChat`

Replace manual `fetch` and WebSocket logic for the _chat interaction_ with `useChat`.

- **Import:** `import { useChat } from '@ai-sdk/vue';`
- **Setup:**
  ```typescript
  const { messages, input, handleSubmit, status } = useChat({
    api: '/api/chat/messages'
    // initialMessages: load from DB if needed
  })
  ```

### 2. Update UI Components

- Map the Vercel AI SDK `Message` object structure to `UChatMessages` and custom components.
- The SDK `Message` has `toolInvocations` which is cleaner than the custom `metadata.toolCalls`.
- Update `ChatToolCall.vue` and `ChatChart.vue` to read from `message.toolInvocations`.

### 3. Hybrid WebSocket Strategy

- The current WebSocket is used for _real-time updates across devices_ or _background tasks_.
- **Strategy:** Keep the WebSocket for _asynchronous server events_ (like "Run Completed") but use the AI SDK's standard HTTP streaming for the direct chat response. This is more reliable for request/response cycles.

## Phase 3: Cleanup & Verification

1.  **Deprecate:** Remove `server/utils/chat-tools.ts` (after logic is fully moved/imported to `ai-tools.ts`).
2.  **Verify:**
    - Test all tools (weather, workouts, charts).
    - Ensure charts still render correctly (checking the `create_chart` tool response).
    - Check database logging (Prisma).
    - Check room renaming functionality.

## Timeline & Risks

- **Estimate:** 1-2 Days.
- **Risk:** The custom `Message` structure in the DB needs to remain compatible or be transformed when loading history into `useChat`. The AI SDK expects specific roles (`user`, `assistant`, `system`, `tool`). We need to ensure our DB `chatMessage` rows map correctly to `CoreMessage` when seeding the chat.
