# 063 — Admin queue status API is unauthenticated

**Type:** Bug  
**Priority:** High  
**Area:** `infra`, `backend`, `admin`  
**Status:** Open

## Description

`GET /api/admin/queues/status` has an explicit TODO and no auth check, unlike other `/api/admin/*` routes. Anyone can read BullMQ queue depths, worker counts, and failed job counts.

## Root Cause

```15:16:server/api/admin/queues/status.get.ts
export default defineEventHandler(async (event) => {
  // TODO: Add admin authorization check here if not globally applied to /api/admin/*
```

## Steps to Reproduce

1. `GET /api/admin/queues/status` without authentication.
2. Response includes queue metrics and worker counts.

## Expected Behavior

- Admin session required (same as other admin APIs).

## Actual Behavior

- Public access to operational queue intelligence.

## Affected Files

- `server/api/admin/queues/status.get.ts`
- `app/pages/admin/queues/index.vue` (no admin middleware — polls this endpoint)

## Suggested Fix

Add `requireAdmin` or equivalent; add `admin` middleware to queues page.

## Acceptance Criteria

- [ ] Unauthenticated requests return 401/403
- [ ] Admin page requires admin role
