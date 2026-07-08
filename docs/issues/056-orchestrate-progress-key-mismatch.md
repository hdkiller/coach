# 056 — Orchestrate progress SSE uses wrong user key

**Type:** Bug  
**Priority:** High  
**Area:** `backend`, `integrations`, `infra`  
**Status:** Open

## Description

Full sync stores progress in `activeSyncs` keyed by `user.id`, but the progress SSE endpoint looks up state by `session.user.email`. The stream almost always returns `no_sync` even while a sync is running.

## Root Cause

`full-sync.post.ts` uses `userId = user.id`:

```71:98:server/api/orchestrate/full-sync.post.ts
  const userId = user.id
  activeSyncs.set(userId, syncState)
```

`progress.get.ts` uses email:

```34:53:server/api/orchestrate/progress.get.ts
  const userId = session.user.email
  const syncState = activeSyncs.get(userId)
```

## Steps to Reproduce

1. Trigger full orchestrated sync.
2. Connect to `/api/orchestrate/progress` SSE.
3. Stream reports no active sync despite sync running.

## Expected Behavior

- Progress SSE reflects in-progress sync state.

## Actual Behavior

- Key mismatch prevents state lookup.
- Additional concern: in-memory `activeSyncs` does not work across multiple server instances.

## Affected Files

- `server/api/orchestrate/full-sync.post.ts`
- `server/api/orchestrate/progress.get.ts`

## Suggested Fix

Use consistent `user.id` key in both endpoints. Consider Redis or DB-backed progress for multi-instance deployments.

## Acceptance Criteria

- [ ] SSE receives task updates during active sync
- [ ] Same user key used for set and get
