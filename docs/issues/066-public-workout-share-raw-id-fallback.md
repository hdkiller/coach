# 066 — Public workout share accepts raw workout IDs (privacy bypass)

**Type:** Bug  
**Priority:** High  
**Area:** `workouts`, `backend`, `integrations`  
**Status:** Fixed

> **Fixed (2026-07-08):** Removed raw workout ID fallback; share endpoint now requires a valid WORKOUT share token.

## Description

The workout share endpoint falls back to treating the path token as a **direct workout ID** when no share token exists. Only `isPrivate` workouts are blocked. Any non-private workout is readable by UUID without an explicit share link.

## Root Cause

```68:71:server/api/share/workouts/[token].get.ts
  } else {
    workoutId = token
  }
```

## Steps to Reproduce

1. Obtain or guess a non-private workout UUID.
2. `GET /api/share/workouts/{workoutId}` without creating a share token.
3. Full workout + streams returned.

## Expected Behavior

- Only valid, non-expired share tokens grant access.

## Actual Behavior

- Raw workout IDs work as implicit share tokens for non-private workouts.

## Affected Files

- `server/api/share/workouts/[token].get.ts`

## Suggested Fix

Remove ID fallback; require explicit `shareToken` record.

## Acceptance Criteria

- [ ] Unknown tokens return 404
- [ ] Legitimate share links still work
