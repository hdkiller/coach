# 310 — Garmin Ingest Does Not Refresh Export Permissions

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations`  
**Status:** Fixed

> **Fixed (2026-07-16):** `refreshGarminIntegrationPermissions` best-effort merges `GET /user/permissions` into `Integration.scope` on ingest start and after OAuth callback. Failures never block ingest/connect.

## Description

OAuth callback stores token `scope` (API/partner scopes). User export permissions (`ACTIVITY_EXPORT`, `HEALTH_EXPORT`, `WORKOUT_IMPORT`, …) arrive via Push `userPermissionsChange` or live `GET /wellness-api/rest/user/permissions`.

Training publish already refreshes permissions before checking `WORKOUT_IMPORT`. Manual / scheduled ingest does not, so DB `Integration.scope` can stay stale until a permissions Push arrives.

## Steps to Reproduce

1. Connect Garmin; note stored `scope` from token exchange.
2. Change export permissions in Garmin Connect without a permissions Push reaching us.
3. Ingest still runs against stale scope (Garmin may simply withhold data).

## Expected Behavior

Best-effort `GET /user/permissions` merge at ingest start (non-fatal if it fails), similar to publish-garmin.

## Affected Files

- `server/utils/garmin.ts` (`refreshGarminIntegrationPermissions`)
- `trigger/ingest-garmin.ts`
- `server/api/integrations/garmin/callback.get.ts`
- `tests/unit/server/utils/garmin.test.ts`

## Acceptance Criteria

- [x] Ingest merges live permissions when possible
- [x] Permissions fetch failure does not fail ingest of core summaries
- [x] OAuth callback also refreshes permissions best-effort
- [x] Existing users with correct Push permissions unchanged
