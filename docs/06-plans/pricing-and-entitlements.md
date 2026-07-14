# Pricing & Entitlements Specification

## 1. Overview

This document defines the subscription tiers, entitlements, and technical implementation for Coach Watts monetization.

## 2. Subscription Tiers

| Tier          | Monthly Price | Annual Price | Description                                      |
| :------------ | :------------ | :----------- | :----------------------------------------------- |
| **Free**      | $0            | N/A          | The smartest logbook you’ve ever used.           |
| **Supporter** | $8.99         | $89.99       | Automated insights for the self-coached athlete. |
| **Pro**       | $14.99        | $119.00      | Your full-service Digital Twin and Coach.        |

## 3. Entitlements Matrix

| Feature             | Free               | Supporter             | Pro                   |
| :------------------ | :----------------- | :-------------------- | :-------------------- |
| Data History        | Unlimited          | Unlimited             | Unlimited             |
| Sync Mode           | Manual             | Automatic             | Automatic             |
| Workout Analysis    | On-Demand (Manual) | Automatic (Always-On) | Automatic (Always-On) |
| AI Engine           | Standard (Fast)    | Standard (Fast)       | Deep Reasoning        |
| Priority Processing | No                 | Yes                   | Yes                   |
| Proactivity         | No                 | No                    | Yes                   |

## 4. Technical Entitlement Object

The system should use a canonical entitlement object to gate features in the UI and API.

```typescript
export interface UserEntitlements {
  tier: 'FREE' | 'SUPPORTER' | 'PRO'
  autoSync: boolean
  autoAnalysis: boolean
  aiModel: 'flash' | 'pro'
  priorityProcessing: boolean
  proactivity: boolean
}
```

## 5. Implementation Rules

### 5.1 AI Credit & Usage

- **Free:** Unlimited standard analysis, but requires manual trigger (On-Demand).
- **Supporter/Pro:** Background jobs automatically trigger analysis on ingestion.
- **Pro:** Uses `gemini-pro` for analysis and chat.

### 5.2 Stripe Mapping

These IDs must be configured in the `.env` file.

| Tier      | Stripe Product ID | Price ID (Monthly)        | Price ID (Annual)        |
| :-------- | :---------------- | :------------------------ | :----------------------- |
| Supporter | `prod_supporter`  | `price_supporter_monthly` | `price_supporter_annual` |
| Pro       | `prod_pro`        | `price_pro_monthly`       | `price_pro_annual`       |

## 6. UX Requirements

### 6.1 Feature Gating (The "Lock")

- **Deep Analysis:** When a Free/Supporter user views a workout, the "Deep Analysis" tab or section should be visible but blurred or locked with a "Pro Feature" badge. Clicking it opens the Upgrade Modal.
- **Proactivity:** Free/Supporter users do not see unsolicited messages. A setting toggle for "Proactive AI Tips" should be disabled (grayed out) with a Pro badge in the Settings page.

### 6.2 Sync Status

- **Free Users:** Dashboard shows a "Sync Now" button. "Last sync: [Time]" is displayed.
- **Supporter/Pro Users:** Dashboard shows "Auto-sync active" with a pulsing green indicator or similar subtle status.

## 7. Stripe Integration Strategy

### 7.1 Checkout Flow

We will use **Stripe Checkout** (hosted page) for simplicity and security.

1.  User clicks "Upgrade" in App.
2.  App calls `/api/stripe/checkout-session` with `priceId`.
3.  Server creates Stripe Session (mode: `subscription`, success_url: `/settings/billing?success=true`, cancel_url: `/settings/billing?canceled=true`).
4.  User is redirected to Stripe.
5.  On success, user returns to App. Webhook fulfills the subscription.

### 7.2 Subscription Management

We will use **Stripe Customer Portal** for managing existing subscriptions.

1.  User clicks "Manage Subscription" in Settings.
2.  App calls `/api/stripe/portal-session`.
3.  Server returns URL.
4.  User is redirected to Stripe Portal to upgrade, downgrade, cancel, or update card.

### 7.3 Webhooks

We must listen for the following events at `/api/stripe/webhook`:

- `checkout.session.completed`: Initial subscription activation.
- `customer.subscription.updated`: Renewals, upgrades, downgrades.
- `customer.subscription.deleted`: Cancellation (downgrade to FREE).

## 8. UI Elements

### 8.1 Pricing Page (Public & In-App)

- **Toggle:** Monthly / Annual switcher (defaults to Annual).
- **Savings Badge:** "Save 33%" on Pro Annual.
- **Current Plan Indicator:** "Your Current Plan" button disabled.

### 8.2 Settings > Billing

- **Current Status:** "You are on the **Pro** plan."
- **Next Billing Date:** "Renews on Feb 26, 2026."
- **Actions:** "Manage Subscription" (primary), "View Invoices" (secondary - via Portal).

### 8.3 Upgrade Modal

- **Trigger:** Triggered when clicking a locked feature.
- **Content:** Focused "Upsell" card for the specific tier required.
  - _Example:_ Clicking "Deep Analysis" shows the Pro benefit specifically.

## 9. Page Architecture & Routes

### 9.1 Public & Marketing

- **`/pricing`**: Public landing page for prospective users.
  - **Components:** `PricingPlans.vue` (with Monthly/Annual toggle).
  - **Logic:** If logged out -> "Get Started" (Sign Up). If logged in -> "Upgrade" (Checkout).

### 9.2 Subscription Management (Logged In)

- **`/settings/billing`**: The central hub for user subscription management.
  - **View:** Current Plan Name, Status (Active, Past Due, Canceled), Next Renewal Date.
  - **Primary Action:** "Manage Subscription" button.
    - **Behavior:** Calls `/api/stripe/portal-session` and redirects the user to the **Stripe Customer Portal**.
    - **Why:** We offload Upgrade/Downgrade/Cancel/Update Card logic to Stripe's hosted portal to reduce dev effort and PCI scope.
  - **Secondary Action:** "Upgrade" (if on Free/Supporter).
    - **Behavior:** Opens the `UpgradeModal` or redirects to `/pricing`.
  - **Invoice History:** "View Invoices" link (redirects to Stripe Portal).

### 9.3 Checkout Flow (Stripe Hosted)

- **`https://checkout.stripe.com/...`**: Users are redirected here to pay.
- **`/settings/billing?success=true`**: Return URL after successful payment.
  - **Behavior:** Shows a success toast/confetti. Triggers a store refresh to update entitlements immediately.
- **`/settings/billing?canceled=true`**: Return URL if user cancels checkout.
  - **Behavior:** Shows a generic "Checkout canceled" message.

## 10. Technical Detail: Database & Logic

### 10.1 Prisma Schema Updates

This is the single source of truth for the database changes.

```prisma
enum SubscriptionTier {
  FREE
  SUPPORTER
  PRO
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED      // User canceled, but period hasn't ended yet
  PAST_DUE      // Payment failed, retrying
  UNPAID        // Payment failed multiple times
  NONE          // Never subscribed or fully expired
}

model User {
  // ... existing fields ...

  // Subscription Fields
  stripeCustomerId       String?   @unique // The customer ID in Stripe
  stripeSubscriptionId   String?   @unique // The active subscription ID
  subscriptionTier       SubscriptionTier @default(FREE)
  subscriptionStatus     SubscriptionStatus @default(NONE)
  subscriptionPeriodEnd  DateTime? // Access is valid until this date

  @@index([subscriptionTier])
}
```

### 10.2 Entitlements Calculation Logic (`server/utils/entitlements.ts` + `shared/effective-tier.ts`)

Effective tier is resolved from paid subscription (including grace period), signup trial, and promotional partner grants. The highest valid tier wins. Promotional grants are stored in `PartnerCampaignRedemption` and never modify Stripe subscription fields.

We must handle the "Grace Period" (Canceled but paid).

```typescript
export function getUserEntitlements(user: User): UserEntitlements {
  const now = new Date()
  const periodEnd = user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd) : new Date(0)

  // A user is effectively "Premium" if:
  // 1. Status is ACTIVE
  // 2. OR Status is CANCELED (or NONE/PAST_DUE) but we are still before periodEnd (Grace Period)
  const isEffectivePremium =
    user.subscriptionStatus === 'ACTIVE' || (user.subscriptionPeriodEnd && now < periodEnd)

  // Fallback to FREE if subscription is dead
  const effectiveTier = isEffectivePremium ? user.subscriptionTier : 'FREE'

  return {
    tier: effectiveTier,
    autoSync: effectiveTier !== 'FREE',
    autoAnalysis: effectiveTier !== 'FREE',
    aiModel: effectiveTier === 'PRO' ? 'pro' : 'flash',
    priorityProcessing: effectiveTier !== 'FREE',
    proactivity: effectiveTier === 'PRO'
  }
}
```

### 10.3 Webhook State Mapping

How we map incoming Stripe events to DB status.

| Stripe Status | Internal `subscriptionStatus` | Logic                                                                                                                                                                                                                                 |
| :------------ | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `active`      | `ACTIVE`                      | Grant access.                                                                                                                                                                                                                         |
| `trialing`    | `ACTIVE`                      | Grant access.                                                                                                                                                                                                                         |
| `past_due`    | `PAST_DUE`                    | **Grace Period Logic applies.** Don't cut access immediately, wait for Stripe retry settings.                                                                                                                                         |
| `canceled`    | `CANCELED`                    | **Important:** Stripe sends this when the period _actually ends_ (if configured to cancel at period end). If explicit cancel happens mid-cycle, update `subscriptionStatus` to `CANCELED` but keep `subscriptionPeriodEnd` in future. |
| `unpaid`      | `UNPAID`                      | Cut access (Grace period over).                                                                                                                                                                                                       |

## 11. Implementation Checklist

### Phase 1: Foundation

- [ ] **Schema:** Update `User` model with `stripeCustomerId`, `subscriptionStatus`, `subscriptionTier`.
- [ ] **Stripe Setup:** Create Products & Prices in Stripe Dashboard (Test Mode).
- [ ] **Env:** Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Price IDs to `.env`.

### Phase 2: Backend

- [ ] **Middleware:** Create `server/utils/entitlements.ts` to resolve user tier and capabilities.
- [ ] **API:** Create `/api/stripe/checkout-session` endpoint.
- [ ] **API:** Create `/api/stripe/portal-session` endpoint.
- [ ] **Webhooks:** Create `/api/stripe/webhook` handler to sync DB with Stripe events.

### Phase 3: Frontend

- [ ] **Store:** Update `user` store to fetch and hold `subscriptionStatus` and computed `entitlements`.
- [ ] **UI:** Build `PricingToggle` (Monthly/Annual) in `PricingPlans.vue`.
- [ ] **UI:** Create `UpgradeModal.vue` component.
- [ ] **UI:** Build `/settings/billing` page.

### Phase 4: Gating & Logic

- [ ] **Sync:** Update `ingest` triggers to check `entitlements.autoSync`.
- [ ] **Analysis:** Update `analyze` triggers to check `entitlements.autoAnalysis` and `entitlements.aiModel`.
- [ ] **Chat:** Update chat logic to check `entitlements.aiModel` (Flash vs Pro).
- [ ] **Proactivity:** Implement "Proactive" check in scheduled jobs.
