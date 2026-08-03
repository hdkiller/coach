# 311 — Garmin Ad-Hoc Pull vs Ping/Push Partner Guidance

**Type:** Maintenance / Compliance  
**Priority:** Low  
**Area:** `integrations, compliance`  
**Status:** Resolved (CW-90)

## Description

Garmin Start Guide / Health tips prefer Ping or Push driven delivery; summary GETs after callback. Coach Watts uses Push as primary realtime path and also supports on-demand pull via `ingest-garmin` / Sync UI (`/dailies`, `/sleeps`, `/hrv`, `/activities`) for recovery and manual sync.

This is operationally valuable and already live for users. Strict Ping-only partners may flag ad-hoc polling in a compliance review. No code change planned until Garmin feedback or endpoint config requires it.

## Expected Behavior

Keep Push primary; treat pull as recovery. Document for audits. Optionally rate-limit / shorten default sync windows further if asked.

## Affected Files

- `trigger/ingest-garmin.ts`
- `server/api/integrations/sync.post.ts`
- `server/api/webhooks/garmin.post.ts`

## Related

- [069](./069-garmin-webhook-unauthenticated.md) — webhook auth still postponed
- [172](./172-garmin-ingest-clamps-24h-window.md) — multi-day pull slicing (Fixed)

## Acceptance Criteria

- [ ] Confirmed with Garmin endpoint config (Push vs Ping) in developer portal —
      still outstanding; requires Garmin developer portal access, not
      something this change can confirm. Endpoint config itself is unchanged.
- [x] Decision recorded: keep pull as recovery, now enforced in code, not just
      policy. See `docs/01-architecture/system-overview.md#garmin-push-first-policy`.

## Resolution (CW-90)

Ad-hoc pull is code-enforced as recovery-only rather than left as an
unenforced convention:

- **Cooldown:** `trigger/ingest-garmin.ts` and
  `server/api/integrations/sync.post.ts` both reject/skip an ad-hoc pull if
  the integration's `lastSyncAt` is under 15 minutes old.
- **Bounded window:** the ad-hoc lookback window is capped at 3 days in both
  files, regardless of any caller-supplied `days` override — closing the gap
  where a direct API call with a large `days` value could turn a single
  "Sync" click into a multi-week historical backfill.

The Garmin developer portal Push vs Ping endpoint configuration itself was
not changed and was not re-confirmed as part of this work (no portal access
from this change) — that checkbox stays open for whoever owns the Garmin
partner account if a formal audit later requires it.
