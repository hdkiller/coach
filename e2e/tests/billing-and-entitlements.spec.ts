import { test, expect } from '../fixtures/test-fixtures.ts'
import { BillingPage } from '../pages/BillingPage.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

const TEST_STRIPE_CUSTOMER_ID = 'cus_e2e_athlete_test_billing_123'
const TEST_STRIPE_SUB_ID = 'sub_e2e_test_pro_billing_999'

test.describe('Billing & Entitlements Suite', () => {
  test.describe.configure({ mode: 'serial' })

  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']
  let athleteId: string

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool

    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete, `Test athlete ${E2E_ATHLETE_EMAIL} must exist in seed data`).toBeTruthy()
    athleteId = athlete!.id
  })

  test.afterAll(async () => {
    // Reset athlete to clean FREE tier baseline after test suite completes
    if (athleteId && prisma) {
      await prisma.user.update({
        where: { id: athleteId },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'NONE',
          subscriptionPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null
        }
      })
      await prisma.providerSubscription.deleteMany({
        where: { userId: athleteId }
      })
    }
    if (cleanupPool) {
      await cleanupPool.end()
    }
  })

  test('1. Free athlete renders billing page and returns FREE tier status', async ({
    authedPage
  }) => {
    // Set athlete to clean FREE tier baseline (no active Stripe customer ID to prevent external API calls)
    await prisma.user.update({
      where: { id: athleteId },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null
      }
    })

    // Assert subscriptions API returns FREE tier
    const subRes = await authedPage.request.get('/api/subscriptions/me')
    expect(subRes.ok()).toBeTruthy()
    const subData = await subRes.json()
    expect(subData.tier).toBe('FREE')

    // Navigate to billing page
    const billing = new BillingPage(authedPage)
    await billing.goto()
    await expect(authedPage).toHaveURL(/\/settings\/billing|\/pricing/)
  })

  test('2. Processing Stripe subscription created webhook updates athlete to PRO tier', async ({
    authedPage
  }) => {
    // Ensure athlete has matching stripeCustomerId in database
    await prisma.user.update({
      where: { id: athleteId },
      data: {
        stripeCustomerId: TEST_STRIPE_CUSTOMER_ID
      }
    })

    const webhookPayload = {
      id: 'evt_e2e_test_sub_created_' + Date.now(),
      object: 'event',
      type: 'customer.subscription.created',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: TEST_STRIPE_SUB_ID,
          object: 'subscription',
          customer: TEST_STRIPE_CUSTOMER_ID,
          status: 'active',
          created: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          cancel_at_period_end: false,
          items: {
            object: 'list',
            data: [
              {
                id: 'si_test_1',
                price: {
                  id: 'price_pro_monthly',
                  product: { id: 'prod_pro', name: 'Coach Watts Pro', metadata: { tier: 'pro' } },
                  lookup_key: 'pro',
                  nickname: 'Pro'
                }
              }
            ]
          }
        }
      }
    }

    const res = await authedPage.request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 'e2e-signature' },
      data: webhookPayload
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    // Assert user DB record updated
    const updatedUser = await prisma.user.findUnique({ where: { id: athleteId } })
    expect(updatedUser?.subscriptionTier).toBe('PRO')
    expect(updatedUser?.subscriptionStatus).toBe('ACTIVE')
    expect(updatedUser?.stripeSubscriptionId).toBe(TEST_STRIPE_SUB_ID)

    // Assert /api/subscriptions/me reflects PRO tier
    const subRes = await authedPage.request.get('/api/subscriptions/me')
    expect(subRes.ok()).toBeTruthy()
    const subData = await subRes.json()
    expect(subData.tier).toBe('PRO')
  })

  test('3. Cancellation webhook sets status to CANCELED while retaining PRO access during Grace Period', async ({
    authedPage
  }) => {
    const futurePeriodEnd = new Date(Date.now() + 15 * 86400 * 1000)

    const webhookPayload = {
      id: 'evt_e2e_test_sub_updated_' + Date.now(),
      object: 'event',
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: TEST_STRIPE_SUB_ID,
          object: 'subscription',
          customer: TEST_STRIPE_CUSTOMER_ID,
          status: 'active',
          created: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(futurePeriodEnd.getTime() / 1000),
          cancel_at_period_end: true,
          items: {
            object: 'list',
            data: [
              {
                id: 'si_test_1',
                price: {
                  id: 'price_pro_monthly',
                  product: { id: 'prod_pro', name: 'Coach Watts Pro', metadata: { tier: 'pro' } },
                  lookup_key: 'pro',
                  nickname: 'Pro'
                }
              }
            ]
          }
        }
      }
    }

    const res = await authedPage.request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 'e2e-signature' },
      data: webhookPayload
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    // DB status becomes CANCELED, but period end is in the future
    const updatedUser = await prisma.user.findUnique({ where: { id: athleteId } })
    expect(updatedUser?.subscriptionStatus).toBe('CANCELED')

    // Effective entitlements must still grant PRO tier during grace period
    const subRes = await authedPage.request.get('/api/subscriptions/me')
    expect(subRes.ok()).toBeTruthy()
    const subData = await subRes.json()
    expect(subData.tier).toBe('PRO')
  })

  test('4. Subscription deleted webhook cleanly downgrades user to FREE tier', async ({
    authedPage
  }) => {
    const webhookPayload = {
      id: 'evt_e2e_test_sub_deleted_' + Date.now(),
      object: 'event',
      type: 'customer.subscription.deleted',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: TEST_STRIPE_SUB_ID,
          object: 'subscription',
          customer: TEST_STRIPE_CUSTOMER_ID,
          status: 'canceled',
          created: Math.floor(Date.now() / 1000) - 30 * 86400,
          current_period_end: Math.floor(Date.now() / 1000) - 100, // Past period end
          cancel_at_period_end: true,
          items: {
            object: 'list',
            data: [
              {
                id: 'si_test_1',
                price: {
                  id: 'price_pro_monthly',
                  product: { id: 'prod_pro', name: 'Coach Watts Pro', metadata: { tier: 'pro' } },
                  lookup_key: 'pro',
                  nickname: 'Pro'
                }
              }
            ]
          }
        }
      }
    }

    const res = await authedPage.request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 'e2e-signature' },
      data: webhookPayload
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    // User should revert to FREE tier
    const updatedUser = await prisma.user.findUnique({ where: { id: athleteId } })
    expect(updatedUser?.subscriptionTier).toBe('FREE')

    const subRes = await authedPage.request.get('/api/subscriptions/me')
    expect(subRes.ok()).toBeTruthy()
    const subData = await subRes.json()
    expect(subData.tier).toBe('FREE')
  })

  test('5. Lifetime grant (CONTRIBUTOR status) is immune to Stripe subscription deletion events', async ({
    authedPage
  }) => {
    // Manually grant lifetime access to athlete
    await prisma.user.update({
      where: { id: athleteId },
      data: {
        subscriptionStatus: 'CONTRIBUTOR',
        subscriptionTier: 'PRO',
        subscriptionPeriodEnd: null,
        stripeCustomerId: TEST_STRIPE_CUSTOMER_ID,
        stripeSubscriptionId: TEST_STRIPE_SUB_ID
      }
    })

    // Send a Stripe cancellation/deletion event
    const webhookPayload = {
      id: 'evt_e2e_test_sub_deleted_contributor_' + Date.now(),
      object: 'event',
      type: 'customer.subscription.deleted',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: TEST_STRIPE_SUB_ID,
          object: 'subscription',
          customer: TEST_STRIPE_CUSTOMER_ID,
          status: 'canceled',
          items: {
            object: 'list',
            data: [
              {
                id: 'si_test_1',
                price: {
                  id: 'price_pro_monthly',
                  product: { id: 'prod_pro', name: 'Coach Watts Pro', metadata: { tier: 'pro' } },
                  lookup_key: 'pro',
                  nickname: 'Pro'
                }
              }
            ]
          }
        }
      }
    }

    const res = await authedPage.request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 'e2e-signature' },
      data: webhookPayload
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    // Assert user status remains CONTRIBUTOR and tier remains PRO
    const updatedUser = await prisma.user.findUnique({ where: { id: athleteId } })
    expect(updatedUser?.subscriptionStatus).toBe('CONTRIBUTOR')
    expect(updatedUser?.subscriptionTier).toBe('PRO')

    const subRes = await authedPage.request.get('/api/subscriptions/me')
    expect(subRes.ok()).toBeTruthy()
    const subData = await subRes.json()
    expect(subData.tier).toBe('PRO')
  })
})
