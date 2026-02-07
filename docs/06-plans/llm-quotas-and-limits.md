# LLM Quotas and Limits System Design

## 1. Overview

This document outlines the architecture for a centralized, subscription-based quota system for LLM-related features in Coach Watts. The system is designed to prevent abuse of expensive AI resources while providing a clear path for user upgrades.

## 2. Core Objectives

- **Centralization**: Manage all AI-related limits (Chat, Analysis, Reports) in one place.
- **Flexibility**: Support various rolling windows (hours, days, weeks).
- **Transparency**: Allow users to see their current usage and remaining capacity.
- **Hybrid Enforcement**: Support both strict blocking and passive measurement.

## 3. Quota Definitions

Quotas are defined as a mapping between a **Subscription Tier** and a specific **Operation**.

### 3.1 Operations (Examples)

- `CHAT_MESSAGE`: Sending a message in a chat room.
- `WORKOUT_ANALYSIS`: Analyzing a single activity.
- `ATHLETE_PROFILE`: Generating or refreshing the athlete profile.
- `TRAINING_PLAN`: Generating a weekly or block training plan.

### 3.2 Tier Configuration (Proposed)

| Operation          | Window   | Free | Supporter | Pro       |
| :----------------- | :------- | :--- | :-------- | :-------- |
| `CHAT_MESSAGE`     | 4 Hours  | 5    | 50        | 250       |
| `WORKOUT_ANALYSIS` | 7 Days   | 3    | 15        | 50        |
| `ATHLETE_PROFILE`  | 24 Hours | 1    | 5         | 20        |
| `NUTRITION_LOG`    | 24 Hours | 1    | 10        | Unlimited |

## 4. Technical Architecture

### 4.1 Usage Tracking (Data Plane)

The system leverages the existing `LlmUsage` table. Every AI interaction already creates a record here, including `userId`, `operation`, and `createdAt`.

**Usage Query Logic:**
To calculate current usage, the system queries:

```sql
SELECT COUNT(*)
FROM "LlmUsage"
WHERE "userId" = :userId
  AND "operation" = :operation
  AND "createdAt" >= NOW() - INTERVAL :window;
```

### 4.2 Centralized Registry (`server/utils/quotas/registry.ts`)

A configuration file defining the hard limits. This avoids database overhead for "static" rules but allows quick updates via code.

```typescript
export const QUOTA_REGISTRY = {
  FREE: {
    CHAT_MESSAGE: { limit: 5, window: '4h', enforcement: 'STRICT' },
    WORKOUT_ANALYSIS: { limit: 3, window: '7d', enforcement: 'STRICT' }
  },
  SUPPORTER: {
    CHAT_MESSAGE: { limit: 50, window: '4h', enforcement: 'STRICT' },
    WORKOUT_ANALYSIS: { limit: 15, window: '7d', enforcement: 'STRICT' }
  }
  // ...
}
```

### 4.3 Quota Engine (`server/utils/quotas/engine.ts`)

A utility to aggregate usage and compare against the registry.

**Key functions:**

- `getUsageStatus(userId, operation)`: Returns `{ used, limit, remaining, resetsAt }`.
- `checkQuota(userId, operation)`: Throws a `429 Too Many Requests` error if the quota is exceeded and enforcement is `STRICT`.

### 4.4 API Integration

API endpoints and Trigger.dev tasks will invoke the engine before proceeding with LLM calls.

```typescript
// Example usage in chat API
const status = await checkQuota(user.id, 'CHAT_MESSAGE')
if (!status.allowed) {
  throw createError({ statusCode: 429, statusMessage: 'Quota exceeded' })
}
```

## 5. Frontend Visibility

### 5.1 Quota Status API

A new endpoint `/api/profile/quotas` will return the current user's usage status for all relevant features.

### 5.2 UI Components

- **Progress Badges**: Small indicators in Chat or Workout detail pages showing "X / Y used".
- **Upgrade Prompts**: When a user is near or at their limit, show a contextual "Upgrade to [Tier]" button.
- **Limit Modals**: A dedicated modal explaining the limits when a user attempts an action they've exhausted.

## 6. Implementation Phases

### Phase 1: Measurement & Registry

- Implement `LlmUsage` aggregation logic.
- Create the static `QUOTA_REGISTRY`.
- Add `server/utils/quotas` helper.

### Phase 2: Monitoring & Stats

- Update Admin LLM Stats to show "Users near limit".
- Expose usage via `/api/profile/quotas`.

### Phase 3: Enforcement

- Add `checkQuota` calls to high-cost endpoints (Workout Analysis, Chat).
- Implement "Upgrade" triggers in the UI.

### Phase 4: Optimization

- If usage queries become slow, implement a `UserQuotaCache` table to store current window counts, updated via database triggers or background jobs.
