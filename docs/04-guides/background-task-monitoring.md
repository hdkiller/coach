# Background Task Monitoring Guide

Coach Watts uses a hybrid realtime + polling system for monitoring long-running Trigger.dev jobs.

The canonical transport is documented in [Realtime Message Bus](../01-architecture/realtime-message-bus.md). This guide focuses on how task monitoring works in the UI.

## 🚀 Overview

The monitoring system consists of three layers:

1. **Server-side publish path**
   - User-facing API routes call `tasks.trigger(...)`
   - After a successful trigger, the route publishes an immediate `run_update`
   - This gives the client instant visibility of a newly started run
2. **Global client state (`app/composables/useUserRuns.ts`)**
   - Singleton socket + shared run list
   - Merges realtime updates with `/api/runs/active` fetch results
   - Falls back to polling if realtime is unavailable or disconnected
3. **UI components**
   - `DashboardTriggerMonitor`: floating/collapsible run monitor
   - `TriggerMonitorButton`: navbar button with active run count badge

## 🛠️ How to Use

### 1. Triggering a Task

When you trigger a task from a component, you usually do not need to manually force the monitor to notice it. The server publishes a run-start event in the main task routes.

You can still call `refreshUserRuns()` as a conservative fallback if your route does not yet publish a task event.

```typescript
// In your component (e.g., pages/recommendations/index.vue)
const { refresh: refreshUserRuns } = useUserRuns()

async function startTask() {
  try {
    const res = await $fetch('/api/my-task/trigger', { method: 'POST' })

    // Optional fallback if this route does not yet publish run-start events
    refreshUserRuns()

    toast.add({ title: 'Task Started', color: 'info' })
  } catch (e) {
    // Handle error
  }
}
```

### 2. Reacting to Completion

To update your UI (e.g., refresh a list of recommendations) when a specific task finishes, use the `onTaskCompleted` helper. This listener is global and persistent—it works even if the user navigates away and comes back, or if the task was started in another tab.

```typescript
const { onTaskCompleted } = useUserRunsState()

// Listen for the specific task identifier (defined in your trigger/ file)
onTaskCompleted('generate-recommendations', async (run) => {
  // Optional: Add a small delay to ensure DB replication/consistency
  setTimeout(async () => {
    await refreshData() // Your local data fetch

    toast.add({
      title: 'Success',
      description: 'New data is ready!',
      color: 'success'
    })
  }, 1000)
})
```

### 3. Adding the Monitor to a Page

The `DashboardTriggerMonitor` is already included globally in `layouts/default.vue`, so it appears on all authenticated pages.

To add the **toggle button** to a specific page's navbar (like in the Dashboard or Recommendations page):

```vue
<template>
  <UDashboardNavbar>
    <template #right>
      <!-- Add the button here -->
      <DashboardTriggerMonitorButton />

      <!-- Other buttons... -->
    </template>
  </UDashboardNavbar>
</template>
```

## 🧩 Architecture Details

### Singleton Pattern

The `useUserRuns` composable uses a singleton pattern. The `runs` state and `WebSocket` connection are defined _outside_ the exported function. This ensures that:

- All components share the exact same list of runs.
- Only one WebSocket connection is open per client.
- The connection stays alive as you navigate between pages.

### Hybrid Reliability

The system is designed to be resilient:

1. **Realtime First**: if the shared WebSocket is connected, `run_update` messages are merged immediately.
2. **API Fallback**: `fetchActiveRuns` provides initial state and recovery.
3. **Smart Merging**: if the API is behind but local state already saw a final status, the final status wins.
4. **Polling Fallback**: when the socket disconnects, the composable polls `/api/runs/active`.
5. **Manual Refresh**: the monitor widget still offers a manual refresh button.

### Redis Dependency

Cross-instance task monitor updates depend on `REDIS_URL`.

- With `REDIS_URL`, task-start and other bus messages can reach browser sockets connected to other app instances.
- Without `REDIS_URL`, the monitor still works through local delivery and polling, but you should not expect full cross-instance realtime behavior.

### Troubleshooting

- **Task not appearing immediately?** Confirm the route publishes a task-start event after `tasks.trigger(...)`. If not, add `publishTaskRunStartedEvent(...)`.
- **Cross-instance updates missing?** Confirm `REDIS_URL` is configured for the environment.
- **Need delivery traces?** Enable realtime debug logging with `REALTIME_DEBUG=true`.
- **Status stuck?** The socket may be disconnected or the route may not publish later-state updates yet. Polling/manual refresh should still recover.
- **Run ID vs Task Identifier**: `onTaskCompleted` listens for the `taskIdentifier` (e.g., `generate-weekly-report`), NOT the specific `runId` (e.g., `run_123`). This allows it to catch _any_ instance of that task completing.
