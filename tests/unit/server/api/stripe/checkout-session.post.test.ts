import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import { stripe } from '../../../../../server/utils/stripe'
import { ensureStripeCustomerForUser } from '../../../../../server/utils/stripe-customer'
import { assertNoActiveStoreSubscription } from '../../../../../server/utils/provider-subscriptions'

/** Matches handler fallback + tests/unit/setup.ts default. */
const SITE = 'http://localhost:3099'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn()
      }
    }
  }
}))

vi.mock('../../../../../server/utils/stripe-customer', () => ({
  ensureStripeCustomerForUser: vi.fn()
}))

vi.mock('../../../../../server/utils/provider-subscriptions', () => ({
  assertNoActiveStoreSubscription: vi.fn()
}))

const getHandler = async () =>
  (await import('../../../../../server/api/stripe/checkout-session.post')).default

describe('POST /api/stripe/checkout-session redirect allowlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      name: 'Athlete',
      stripeCustomerId: 'cus_1'
    } as any)
    vi.mocked(assertNoActiveStoreSubscription).mockResolvedValue(undefined as any)
    vi.mocked(ensureStripeCustomerForUser).mockResolvedValue({ customerId: 'cus_1' } as any)
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/pay/cs_test_1'
    } as any)
  })

  it('rejects cross-origin successUrl with 400 and never calls Stripe', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        body: {
          priceId: 'price_1',
          successUrl: 'https://evil.example/phish',
          cancelUrl: `${SITE}/settings/billing?canceled=true`
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/same-origin|Invalid redirect/i)
    })

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('rejects cross-origin cancelUrl with 400', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        body: {
          priceId: 'price_1',
          successUrl: `${SITE}/settings/billing?success=true`,
          cancelUrl: 'https://evil.example/phish'
        }
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('uses default same-origin URLs when omitted', async () => {
    const handler = await getHandler()

    await handler({
      body: { priceId: 'price_1' }
    } as any)

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: `${SITE}/settings/billing?success=true`,
        cancel_url: `${SITE}/settings/billing?canceled=true`
      })
    )
  })

  it('accepts same-origin absolute redirect URLs', async () => {
    const handler = await getHandler()

    await handler({
      body: {
        priceId: 'price_1',
        successUrl: `${SITE}/settings/billing?success=true`,
        cancelUrl: `${SITE}/pricing?canceled=true`
      }
    } as any)

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: `${SITE}/settings/billing?success=true`,
        cancel_url: `${SITE}/pricing?canceled=true`
      })
    )
  })
})
