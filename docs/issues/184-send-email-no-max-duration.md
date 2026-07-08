# 184 — Send Email No Max Duration

**Type:** Bug  
**Priority:** Low  
**Area:** `infra, backend`  
**Status:** Open

## Description

send-email task has no maxDuration; hung render-email fetch blocks worker.

## Steps to Reproduce

Stuck internal render blocks email queue.

## Affected Files

- `trigger/send-email.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
