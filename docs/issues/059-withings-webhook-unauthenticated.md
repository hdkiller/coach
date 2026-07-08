# 059 — Withings webhook has no authenticity check

**Type:** Bug  
**Priority:** High  
**Area:** `integrations`, `backend`, `data`  
**Status:** Open

## Description

The Withings webhook handler accepts POST notifications with no HMAC, shared secret, or signature verification. A caller who knows a Withings `userid` (stored as `integration.externalUserId`) can trigger `ingest-withings` background jobs, enabling job-queue abuse and unnecessary API load.

## Root Cause

`server/api/integrations/withings/webhook.post.ts` logs and processes notifications after only checking `userid` is present — no signature validation step.

## Steps to Reproduce

1. Look up or guess a valid Withings external user ID for an integration.
2. POST fake notification payload to `/api/integrations/withings/webhook`.
3. Ingest job is enqueued.

## Expected Behavior

- Webhook authenticity verified per Withings documentation before enqueueing work.

## Actual Behavior

- Any POST with valid `userid` triggers ingest.

## Affected Files

- `server/api/integrations/withings/webhook.post.ts`

## Suggested Fix

Implement Withings signature/HMAC verification; reject unverified payloads.

## Acceptance Criteria

- [ ] Unsigned/forged webhooks return 401/403
- [ ] Legitimate Withings notifications still process
