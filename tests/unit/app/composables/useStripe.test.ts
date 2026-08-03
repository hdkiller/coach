// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useStripe } from '../../../../app/composables/useStripe'

const STORE_SUBSCRIBER_409 =
  'Your subscription is billed through the App Store. Manage or cancel it in your Apple ID subscription settings before subscribing on the web, so you are not charged twice.'

const { toastAdd, mockFetch } = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  mockFetch: vi.fn()
}))

mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useFetch', () => mockFetch)

function fetchError(bodyMessage: string) {
  return {
    data: ref(null),
    error: ref({
      message: '[POST] "/api/stripe/checkout-session": 409 Conflict',
      data: {
        statusCode: 409,
        message: bodyMessage,
        data: { code: 'STORE_SUBSCRIPTION_ACTIVE', provider: 'APPLE' }
      }
    })
  }
}

describe('useStripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces error.data.message in checkout toast for store-subscriber 409', async () => {
    mockFetch.mockResolvedValue(fetchError(STORE_SUBSCRIBER_409))

    const { createCheckoutSession } = useStripe()
    await createCheckoutSession('price_test')

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Checkout Failed',
        description: STORE_SUBSCRIBER_409,
        color: 'error'
      })
    )
  })

  it('surfaces error.data.message in portal toast', async () => {
    mockFetch.mockResolvedValue({
      data: ref(null),
      error: ref({
        message: '[POST] "/api/stripe/portal-session": 409 Conflict',
        data: { message: STORE_SUBSCRIBER_409 }
      })
    })

    const { openCustomerPortal } = useStripe()
    await openCustomerPortal()

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Portal Access Failed',
        description: STORE_SUBSCRIBER_409,
        color: 'error'
      })
    )
  })

  it('surfaces error.data.message in changePlan toast', async () => {
    mockFetch.mockResolvedValue({
      data: ref(null),
      error: ref({
        message: '[POST] "/api/stripe/change-plan": 409 Conflict',
        data: { message: STORE_SUBSCRIBER_409 }
      })
    })

    const { changePlan } = useStripe()
    const ok = await changePlan('price_test', 'upgrade')

    expect(ok).toBe(false)
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upgrade Failed',
        description: STORE_SUBSCRIBER_409,
        color: 'error'
      })
    )
  })

  it('falls back to generic message when error.data.message is absent', async () => {
    mockFetch.mockResolvedValue({
      data: ref(null),
      error: ref({
        message: '[POST] "/api/stripe/checkout-session": 500 Internal Server Error'
      })
    })

    const { createCheckoutSession } = useStripe()
    await createCheckoutSession('price_test')

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Checkout Failed',
        description: '[POST] "/api/stripe/checkout-session": 500 Internal Server Error',
        color: 'error'
      })
    )
  })
})
