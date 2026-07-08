# 040 — Billing page shows checkout success UI when subscription never activates

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux`, `backend`, `billing`  
**Status:** Open

## Description

After Stripe checkout, users land on `/settings/billing?success=true`. `showSuccessMessage` is initialized from the query param and remains `true` even when `pollSubscription()` exhausts its attempts without finding an `ACTIVE` subscription (e.g. delayed or missed Stripe webhook).

## Root Cause

```30:30:app/pages/settings/billing.vue
  const showSuccessMessage = ref(route.query.success === 'true')
```

Polling only clears `polling` — it does not set `showSuccessMessage = false` when activation is not confirmed. Success banner and celebration UI can display while the user is still on the Free tier.

## Steps to Reproduce

1. Complete Stripe checkout and land on billing with `?success=true`.
2. Simulate a missed or slow webhook so polling never sees `subscriptionStatus === 'ACTIVE'`.
3. Wait for polling to finish (~15s).
4. Success UI remains visible; tier is still FREE.

## Expected Behavior

- Success UI only shows after subscription is confirmed active.
- If polling times out, show a “processing” or “contact support” state instead of success.

## Actual Behavior

- Success banner persists based on URL query param alone.

## Affected Files

- `app/pages/settings/billing.vue`

## Suggested Fix

Only set `showSuccessMessage = true` after confirmed activation. On poll timeout, show a pending-state message and offer manual refresh or support link.

## Acceptance Criteria

- [ ] Success UI hidden when poll completes without ACTIVE status
- [ ] Clear pending/timeout messaging for delayed webhooks
- [ ] Confirmed activation still triggers celebration
