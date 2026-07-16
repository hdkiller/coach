# 311 — Garmin Ad-Hoc Pull vs Ping/Push Partner Guidance

**Type:** Maintenance / Compliance  
**Priority:** Low  
**Area:** `integrations, compliance`  
**Status:** Open

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

- [ ] Confirmed with Garmin endpoint config (Push vs Ping) in developer portal
- [ ] Decision recorded: keep pull as recovery **or** restrict to backfill tool only
