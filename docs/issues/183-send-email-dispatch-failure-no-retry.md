# 183 — Send Email Dispatch Failure No Retry

**Type:** Bug  
**Priority:** Medium  
**Area:** `infra, backend`  
**Status:** Open

## Description

send-email catches dispatch failure and returns success:false without rethrowing; Trigger retry skipped.

## Steps to Reproduce

Email dispatch failure not auto-retried by Trigger.

## Affected Files

- `trigger/send-email.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
