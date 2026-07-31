import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stripe } from '../../../../../server/utils/stripe'
import { prisma } from '../../../../../server/utils/db'
import { auditLogRepository } from '../../../../../server/utils/repositories/auditLogRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readRawBody', async (event: any) => event.__rawBody)
vi.stubGlobal('getHeader', (event: any, name: string) => event.__headers?.[name])
vi.stubGlobal('useRuntimeConfig', () => ({ stripeWebhookSecret: 'whsec_test_secret' }))
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

// `useRuntimeConfig` in webhook.post.ts is auto-imported from `#app/nuxt` at transform
// time (not resolved via the global stub above), so it must be mocked at the module level
// to avoid the real Nuxt composable throwing NUXT_E1001 outside of an app context.
vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ stripeWebhookSecret: 'whsec_test_secret' }),
  useNuxtApp: () => ({ $config: { stripeWebhookSecret: 'whsec_test_secret' } })
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn()
    },
    subscriptions: {
      retrieve: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/auditLogRepository', () => ({
  auditLogRepository: {
    log: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn()
}))

vi.mock('../../../../../server/utils/subscription-tier', () => ({
  getPriceProductId: vi.fn(() => 'prod_1'),
  resolveSubscriptionTier: vi.fn(async () => 'PRO')
}))

vi.mock('../../../../../server/utils/provider-subscriptions', () => ({
  upsertProviderSubscription: vi.fn(async () => ({ stale: false }))
}))

vi.mock('../../../../../server/utils/revenuecat', () => ({
  trackStripeInRevenueCat: vi.fn()
}))

const getHandler = async () =>
  (await import('../../../../../server/api/stripe/webhook.post')).default

const buildEvent = (rawBody: string, headers: Record<string, string> = {}) => ({
  __rawBody: rawBody,
  __headers: headers
})

describe('POST /api/stripe/webhook error sanitization', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns a sanitized message when signature verification fails, without leaking internal error details', async () => {
    const handler = await getHandler()

    const sensitiveMessage =
      'No signatures found matching the expected signature for payload. Are you passing the raw request body? secret=whsec_super_secret_value'
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error(sensitiveMessage)
    })

    const event = buildEvent('{"type":"checkout.session.completed"}', {
      'stripe-signature': 'bad-signature'
    })

    await expect(handler(event as any)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Webhook verification failed'
    })

    // Ensure the raw error message never leaks into the thrown error.
    await handler(event as any).catch((err: any) => {
      expect(err.message).not.toContain(sensitiveMessage)
      expect(err.message).not.toContain('whsec_super_secret_value')
    })

    // But it must still be logged server-side for debugging.
    const loggedSensitive = consoleErrorSpy.mock.calls.some((call) =>
      call.some((arg) =>
        arg instanceof Error
          ? arg.message.includes(sensitiveMessage)
          : typeof arg === 'string' && arg.includes(sensitiveMessage)
      )
    )
    expect(loggedSensitive).toBe(true)
  })

  it('returns a sanitized message when event processing fails, without leaking internal error details', async () => {
    const handler = await getHandler()

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_123',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'cs_123', customer: 'cus_123' } }
    } as any)

    const sensitiveMessage = 'relation "users" violates foreign key constraint on column secret_id'
    vi.mocked(auditLogRepository.log).mockRejectedValue(new Error(sensitiveMessage))

    const event = buildEvent('{"type":"checkout.session.completed"}', {
      'stripe-signature': 'good-signature'
    })

    await expect(handler(event as any)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Webhook processing failed'
    })

    await handler(event as any).catch((err: any) => {
      expect(err.message).not.toContain(sensitiveMessage)
    })

    const loggedSensitive = consoleErrorSpy.mock.calls.some((call) =>
      call.some((arg) =>
        arg instanceof Error
          ? arg.message.includes(sensitiveMessage)
          : typeof arg === 'string' && arg.includes(sensitiveMessage)
      )
    )
    expect(loggedSensitive).toBe(true)
  })
})
