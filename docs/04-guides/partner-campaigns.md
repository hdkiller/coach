# Partner Campaigns

Partner campaigns grant time-limited complimentary access through promotional entitlements. They do not create Stripe subscriptions and do not modify `trialEndsAt`.

## Public URL

Each campaign is available at:

`https://coachwatts.com/partners/<slug>`

Example: [https://coachwatts.com/partners/skool4cyclists](https://coachwatts.com/partners/skool4cyclists)

## Entitlement behavior

Effective tier is the highest currently valid tier from:

1. Active paid Stripe subscription (including grace period)
2. Active signup trial (`trialEndsAt`, SUPPORTER-level for FREE users)
3. Active promotional/partner grant
4. FREE

Rules:

- Promotional grants never shorten, replace, or damage paid subscriptions.
- Expired grants stop applying automatically; no cleanup job is required.
- Redemption is one per user per campaign and idempotent.
- No payment card or Stripe checkout is involved in redemption.

## Privacy boundaries

- Partners receive aggregate campaign metrics only (page views, signup starts, redemption counts/reasons).
- Workout, biometric, recovery, nutrition, goal, and account-level data are never shared with partners.
- CLI support commands may inspect an individual user's grant for internal support, but that output must not be exported to partners.

## Create a campaign (development)

```bash
pnpm cw:cli partners create \
  --slug skool4cyclists \
  --partner-name "Jack Burke / SKOOL 4 Cyclists" \
  --campaign-name "SKOOL 4 Cyclists PRO pilot" \
  --granted-tier PRO \
  --duration-days 60 \
  --max-redemptions 50
```

## Production campaign creation

Production writes require `--prod` and explicit human confirmation before running.

```bash
pnpm cw:cli partners create \
  --prod \
  --slug skool4cyclists \
  --partner-name "Jack Burke / SKOOL 4 Cyclists" \
  --campaign-name "SKOOL 4 Cyclists PRO pilot" \
  --granted-tier PRO \
  --duration-days 60 \
  --max-redemptions 50
```

Expected result:

- A `PartnerCampaign` row with slug `skool4cyclists`
- Public page availability `AVAILABLE`
- Live URL: `https://coachwatts.com/partners/skool4cyclists`

## Support and inspection

```bash
pnpm cw:cli partners list --prod
pnpm cw:cli partners show skool4cyclists --prod
pnpm cw:cli partners user-grant user@example.com --prod
```

## Disable or rollback

To stop new redemptions immediately:

```bash
pnpm cw:cli partners disable skool4cyclists --prod
```

To increase capacity or re-enable:

```bash
pnpm cw:cli partners update-capacity skool4cyclists --max-redemptions 75 --enable --prod
```

Existing redeemed grants remain valid until their `endsAt` timestamp even after a campaign is disabled.

## Analytics events

Aggregate-only partner events:

- `partner_page_view`
- `partner_signup_start`
- `partner_redemption` (`completed`, `already_redeemed`, `rejected`)

Existing integration and activity analytics (`integration_connect_success`, etc.) continue to support week-2 and week-8 funnel reporting without exposing partner-specific athlete data.
