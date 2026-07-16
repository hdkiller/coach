# 307 — Account Deletion Skips Garmin Deregistration

**Type:** Bug  
**Priority:** Critical  
**Area:** `integrations, privacy, compliance`  
**Status:** Fixed

> **Fixed (2026-07-16):** `delete-user-account` calls `deRegisterGarminUser` (`DELETE /wellness-api/rest/user/registration`) before cascading the user row. Failures are logged and do not block local deletion.

## Description

Garmin Developer Program Start Guide requires partners to call delete-user-registration when the partner app provides Delete Account / Opt-Out. Disconnect already did this; full account deletion did not — tokens could remain registered at Garmin after Coach Watts wiped the user.

## Steps to Reproduce

1. Connect Garmin on an account.
2. Delete the Coach Watts account (self-serve or admin).
3. Observe no `DELETE https://apis.garmin.com/wellness-api/rest/user/registration` before DB cascade.

## Expected Behavior

Deregister Garmin with the still-valid access token, then delete the local user (and integration via cascade).

## Affected Files

- `trigger/delete-user-account.ts`
- `server/utils/garmin.ts` (`deRegisterGarminUser`)
- `server/api/integrations/garmin/disconnect.delete.ts` (already correct)

## Acceptance Criteria

- [x] Account deletion attempts Garmin deregistration before `prisma.user.delete`
- [x] Deregistration failure does not prevent account wipe
- [x] Disconnect path unchanged
