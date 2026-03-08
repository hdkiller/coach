# Realtime Message Bus

This document describes the Redis-backed realtime message bus used by Coach Watts for:

- activity/calendar refresh events
- background task monitor updates
- notification fan-out
- chat cross-instance delivery

## Overview

Coach Watts uses a single user-scoped realtime path:

1. Server code publishes a message with `sendToUser(userId, data)`.
2. The current process delivers it to any local WebSocket peers for that user.
3. If `REDIS_URL` is configured, the message is also published to Redis.
4. Other app instances receive the Redis message and replay it to their local peers.

This keeps the application correct in both single-instance and multi-instance deployments.

## Redis Gate

The bus is only enabled when `REDIS_URL` is present.

- With `REDIS_URL`:
  - Redis publisher/subscriber clients are created
  - cross-instance fan-out is enabled
  - `/activities`, notifications, and task monitor updates can propagate between instances
- Without `REDIS_URL`:
  - the Redis bus is disabled
  - no Redis clients are created
  - the app falls back to local delivery, direct refreshes, and polling-based behavior

The capability check lives in [`server/utils/realtime-bus.ts`](../../server/utils/realtime-bus.ts).

## Core Files

- [`server/utils/realtime-bus.ts`](../../server/utils/realtime-bus.ts)
  Generic Redis-gated publisher/subscriber and instance replay logic.
- [`server/utils/ws-state.ts`](../../server/utils/ws-state.ts)
  Local peer registry plus `sendToUser()` and `sendToUserLocal()`.
- [`server/plugins/chat-turn-runner.ts`](../../server/plugins/chat-turn-runner.ts)
  Starts the shared bus subscription and replays remote events to local sockets.
- [`server/api/websocket.ts`](../../server/api/websocket.ts)
  Authenticated WebSocket endpoint for browser clients.
- [`app/composables/useUserRuns.ts`](../../app/composables/useUserRuns.ts)
  Shared client socket singleton that consumes run updates, notifications, and domain events.

## Message Types

The bus currently carries these application messages.

### `run_update`

Used by the background task monitor.

Typical payload:

```ts
{
  type: 'run_update',
  channel: 'task_run',
  runId: 'run_123',
  taskIdentifier: 'generate-weekly-plan',
  status: 'QUEUED',
  startedAt: '2026-03-08T10:00:00.000Z',
  finishedAt?: '2026-03-08T10:00:30.000Z',
  tags?: ['user:abc123']
}
```

### `notification_new`

Used by the notification dropdown and notifications page.

Typical payload:

```ts
{
  type: 'notification_new',
  channel: 'notification',
  notification: {
    id: '...',
    title: '...',
    message: '...',
    icon: 'i-heroicons-bell',
    link: '/recommendations',
    createdAt: '2026-03-08T10:00:00.000Z',
    read: false
  }
}
```

### `domain_event`

Used for broad app-level domain changes. V1 uses it for activity/calendar refresh.

Typical payload:

```ts
{
  type: 'domain_event',
  channel: 'activity',
  event: {
    scope: 'calendar',
    entityType: 'workout',
    entityId: '...',
    reason: 'created',
    occurredAt: '2026-03-08T10:00:00.000Z'
  }
}
```

### Chat Messages

Existing chat realtime messages still use the same transport and replay path. The bus is transport-level shared, not feature-specific.

## Publishers

### Activities

Activity events are emitted by repository-level mutations:

- [`server/utils/repositories/workoutRepository.ts`](../../server/utils/repositories/workoutRepository.ts)
- [`server/utils/repositories/plannedWorkoutRepository.ts`](../../server/utils/repositories/plannedWorkoutRepository.ts)

Helper:

- [`server/utils/activity-realtime.ts`](../../server/utils/activity-realtime.ts)

Current behavior:

- create/update/delete of workouts emits a calendar-scoped `domain_event`
- create/update/delete of planned workouts emits a calendar-scoped `domain_event`

The `/activities` page does not patch local state directly. It debounces a refetch of `/api/calendar`.

### Background Tasks

Task-start events are emitted immediately after successful `tasks.trigger(...)` calls in user-facing routes.

Helper:

- [`server/utils/task-run-events.ts`](../../server/utils/task-run-events.ts)

Current behavior:

- publish a `run_update` with `status: 'QUEUED'`
- the client task monitor inserts the run immediately
- polling remains as fallback/reconciliation

### Notifications

Notifications are created in:

- [`server/utils/notifications.ts`](../../server/utils/notifications.ts)

Current behavior:

- store notification in the database
- publish `notification_new`
- update the dropdown/store without requiring a page refresh

## Client Consumers

### Activity Page

[`app/composables/useActivityRealtime.ts`](../../app/composables/useActivityRealtime.ts) listens for `domain_event` messages on channel `activity`.

It is gated by `config.public.realtimeBusEnabled`, which is derived from `REDIS_URL`.

When a relevant event arrives:

- debounce for 400ms
- refresh `/api/calendar`
- refresh metabolic wave data if needed

### Task Monitor

[`app/composables/useUserRuns.ts`](../../app/composables/useUserRuns.ts) owns the shared client socket and run state.

When a `run_update` arrives:

- merge by `runId`
- preserve local final states over stale non-final API data
- keep polling as fallback if the socket disconnects

### Notifications

[`app/stores/notifications.ts`](../../app/stores/notifications.ts) deduplicates incoming notifications by `id`.

[`app/components/NotificationDropdown.vue`](../../app/components/NotificationDropdown.vue) ensures the shared socket is initialized so notification updates can arrive while the user is active in the UI.

## Logging

Realtime logging is off by default and can be enabled with env vars.

### Environment Variables

```env
REALTIME_DEBUG=true
REALTIME_DEBUG_CHANNELS=activity,task_run,notification,chat,bus,ws
REALTIME_DEBUG_VERBOSE=false
```

### Log Scope

When enabled, logging can show:

- publish attempts
- Redis receive/replay
- local WebSocket delivery counts
- disabled-mode notices when `REDIS_URL` is missing

Logging lives in [`server/utils/realtime-logger.ts`](../../server/utils/realtime-logger.ts).

## Operational Notes

- `sendToUser()` is safe in environments without Redis. It still attempts local same-process delivery.
- Cross-instance correctness depends on `REDIS_URL`.
- Browser realtime consumption is intentionally conservative in v1:
  - activities refetch
  - task monitor merges lightweight run metadata
  - notifications append/dedupe

## Extending The Bus

When adding a new consumer:

1. Define a stable message shape.
2. Publish through `sendToUser()` or a small feature-specific helper.
3. Decide whether the feature should do local patching or refetch-on-event.
4. Keep the feature functional when Redis is absent.
5. Add a dedicated log channel name if troubleshooting value is high.

Prefer reusing the existing bus and socket singleton instead of creating a second realtime transport.
