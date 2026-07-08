# 196 — Sentry No Cefsharp Scanner Filter

**Type:** Bug  
**Priority:** Low  
**Area:** `infra, backend`  
**Status:** Open

## Description

Sentry client config lacks filter for CefSharp email-scanner noise COACH-WATTS-117.

## Steps to Reproduce

Outlook Safe Links inflates Sentry error volume.

## Affected Files

- `sentry.client.config.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
