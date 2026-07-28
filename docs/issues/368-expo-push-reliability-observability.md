# 368 — Expo push reliability and observability gaps

**Priority:** Low  
**Type:** Tech debt / Ops  
**Status:** Resolved (CW-120)  
**Area:** `mobile, notifications, push`

## Summary

`sendExpoPushToUser` is best-effort: HTTP send, parse tickets, prune
`DeviceNotRegistered`. No Expo access token header, no receipt polling, no
structured delivery metrics, limited multi-device failure visibility. Fine for
early companion use; weak for scaling push volume.

## Evidence

- `server/utils/expo-push.ts` — fetch to `exp.host/--/api/v2/push/send`
- Never throws to callers; warns on HTTP failure only
- Expo docs recommend receipts for delivery confirmation and additional error classes

## Suggested Fix

Add optional `EXPO_ACCESS_TOKEN` support; poll receipts (Trigger task or delayed
job); metrics/log fields for sent/error/pruned; consider batching. Keep
best-effort semantics for domain callers unless product requires hard failure.

## Acceptance Criteria

- [x] Documented ops config for Expo push in production — `docs/04-guides/expo-push.md`
- [x] At least ticket-level errors beyond DeviceNotRegistered are handled or logged clearly — structured `ticket_error` / `send_completed` logs in `server/utils/expo-push.ts`
- [x] Receipt or equivalent observability path decided (implement or explicitly defer) — deferred; rationale in expo-push guide
