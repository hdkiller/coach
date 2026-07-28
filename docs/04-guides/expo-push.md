# Expo Push — Ops Configuration & Delivery Strategy

Server-side Expo push for the Coach Watts mobile companion is implemented in
`server/utils/expo-push.ts` via `sendExpoPushToUser`. Sends are **best-effort**:
callers are never blocked on push failure.

## Production configuration

| Variable            | Required | Description                                                                                                                                                                                                                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_ACCESS_TOKEN` | Optional | Expo access token. When set, `sendExpoPushToUser` sends `Authorization: Bearer <token>` on `https://exp.host/--/api/v2/push/send`. Recommended in production so Expo can attribute / rate-limit traffic to your project and so higher send volumes stay within account limits. |

Create a token in the [Expo access token settings](https://expo.dev/accounts/[account]/settings/access-tokens)
with push-related scope. Store it only in the server environment (Vercel / host
secrets) — never in the mobile client or public runtime config.

Other push-related data lives in Postgres (`MobilePushDevice`,
`MobilePushPreference`); no additional Expo env vars are required for basic
sends.

## Current send behavior

1. Honor per-user preference gates (`isMobilePushTypeEnabled`).
2. Load all registered device tokens for the user.
3. POST a batch to Expo’s push API (with optional access-token header).
4. Parse per-device tickets:
   - `DeviceNotRegistered` → prune the token from `MobilePushDevice`.
   - Any other ticket error → structured `console.warn` with `userId`,
     `type`, `deviceId`, token suffix, Expo `error` code, and message.
5. Emit a structured `send_completed` info log with
   `deviceCount` / `ok` / `ticketErrors` / `pruned` / `receiptIdCount`.

Domain callers keep best-effort semantics unless product later requires hard
failure.

## Receipt polling / delivery confirmation — decision

**Decision: defer receipt polling until push volume or incident rate warrants it.**

Expo push is two-phase:

1. **Tickets** (immediate) — accept/reject at the push API. We already act on
   these (prune + structured error logs).
2. **Receipts** (async, via ticket `id`) — confirm APNs/FCM delivery and surface
   delayed errors (`DeviceNotRegistered` after the fact, provider errors).

### Why defer

- Companion push volume is still low; ticket-level observability covers the
  failures we can act on immediately.
- Receipt polling needs durable storage of ticket IDs, a delayed job
  (Trigger.dev task or cron), and prune/metrics wiring — outside the current
  reliability scope and would expand owned surface into `trigger/`.
- Successful tickets already expose `id`; we count them as `receiptIdCount` in
  the completion log so a future worker can be scoped without changing the
  send contract.

### When to implement

Revisit when any of these are true:

- Production push volume makes silent APNs/FCM failures operationally costly.
- Support tickets show “notification not received” with successful ticket logs.
- Expo rate limits or `InvalidCredentials` appear in ticket-error logs.

**Recommended future shape:** persist ticket IDs (or enqueue them) from
`sendExpoPushToUser`, then a Trigger.dev task polls
`https://exp.host/--/api/v2/push/getReceipts` after ~15 minutes, prunes
`DeviceNotRegistered`, and emits delivery metrics.

## Related

- Preferences API / gates: issues 364–365
- Event-type wiring: issues 366–367
- Original reliability gap: issue 368 / Linear CW-120
