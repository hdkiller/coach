# 164 — Chat Turn Retry No Quota

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai,backend`  
**Status:** Open

## Description

Turn retry enqueues new turn without quota check.

## Steps to Reproduce

Retry bypasses chat quota limits.

## Affected Files

- `server/api/chat/turns/[id]/retry.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
