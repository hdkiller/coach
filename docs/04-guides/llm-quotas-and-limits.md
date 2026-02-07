# LLM Quotas and Limits System Guide

## 1. Overview

The LLM Quota system provides a centralized way to track and limit user access to expensive AI operations (Chat, Analysis, Reports) based on their subscription tier.

The system currently operates in **Measurement-only** mode, meaning it tracks usage and displays it to admins/users but does not block any actions yet.

## 2. Core Concepts

### 2.1 Rolling Windows

Unlike systems that reset on the 1st of the month, Coach Watts uses **Rolling Windows**.

- A "4-hour" window means the system looks at the last 4 hours from the current moment.
- As time passes, old usage records "drop out" of the window, making room for new requests.

### 2.2 Enforcement Modes

Defined in the registry for each operation/tier:

- `MEASURE`: Usage is calculated and displayed. If a user exceeds the limit, the system logs it but allows the operation to proceed.
- `STRICT`: If the user exceeds the limit, the system throws a `429 Too Many Requests` error and prevents the AI call.

## 3. Architecture

### 3.1 The Registry (`server/utils/quotas/registry.ts`)

This is the single source of truth for all limits. It maps `SubscriptionTier` to `QuotaOperation`.

```typescript
export const QUOTA_REGISTRY = {
  FREE: {
    chat: { limit: 5, window: '4 hours', enforcement: 'MEASURE' },
    workout_analysis: { limit: 10, window: '7 days', enforcement: 'MEASURE' }
  }
  // ...
}
```

### 3.2 The Engine (`server/utils/quotas/engine.ts`)

The engine performs high-performance raw SQL queries against the `LlmUsage` table to calculate current usage.

- `getQuotaStatus(userId, operation)`: Returns detailed metrics (used, remaining, resetsAt).
- `checkQuota(userId, operation)`: The "guard" function used in APIs.

### 3.3 Data Source

The system uses the existing `LlmUsage` table. Every successful LLM call (where `success: true`) counts towards the quota.

## 4. Admin & Monitoring

### 4.1 Quota Dashboard

Accessible at `/admin/stats/llm/quotas`.

- **Default View**: Shows users who have consumed **80% or more** of their allocated quota.
- **Show All**: A toggle to see every user who has performed at least one operation in their current window.

### 4.2 System Status

The main `/admin` dashboard includes an "LLM Quotas" item in the **System Status** card, showing the count of users nearing their limits.

### 4.3 CLI Debugger

Admins can check any user's real-time status via the CLI:

```bash
pnpm cw:cli debug quotas [user-email] --operation all
```

## 5. Integration Guide

### 5.1 Adding a Guard to an API

To protect a new endpoint, import `checkQuota` and call it at the start of your handler:

```typescript
import { checkQuota } from '~/server/utils/quotas/engine'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  await checkQuota(userId, 'my_new_operation')
  // Proceed with AI logic...
})
```

### 5.2 Adding a Guard to a Trigger.dev Task

Tasks should check quotas to avoid wasting compute. If a limit is hit, update the record status to `QUOTA_EXCEEDED`.

```typescript
try {
  await checkQuota(userId, 'workout_analysis')
} catch (e) {
  if (e.statusCode === 429) {
    await repository.updateStatus(id, 'QUOTA_EXCEEDED')
    return { success: false, reason: 'QUOTA_EXCEEDED' }
  }
}
```

## 6. Modifying Limits

To update a limit or add a new operation:

1.  Open `server/utils/quotas/registry.ts`.
2.  Update the `QuotaOperation` type.
3.  Add/Update the definition in the `QUOTA_REGISTRY` object.
4.  If the operation has variations (e.g., `chat_ws` vs `chat`), add a mapping in the `mapOperationToQuota` function.
