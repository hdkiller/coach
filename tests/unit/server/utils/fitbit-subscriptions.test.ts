import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  FITBIT_WEBHOOK_COLLECTIONS,
  subscribeFitbitWebhooks
} from '../../../../server/utils/fitbit-subscriptions'

describe('subscribeFitbitWebhooks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('subscribes to all Fitbit webhook collections', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 201 }))

    const result = await subscribeFitbitWebhooks('access-token')

    expect(result.subscribed).toEqual([...FITBIT_WEBHOOK_COLLECTIONS])
    expect(result.alreadySubscribed).toEqual([])
    expect(result.failed).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(FITBIT_WEBHOOK_COLLECTIONS.length)

    for (const collection of FITBIT_WEBHOOK_COLLECTIONS) {
      expect(fetch).toHaveBeenCalledWith(
        `https://api.fitbit.com/1/user/-/${collection}/apiSubscriptions/coachwatts.json`,
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer access-token' }
        })
      )
    }
  })

  it('treats 409 as already subscribed', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('conflict', { status: 409 }))

    const result = await subscribeFitbitWebhooks('access-token')

    expect(result.subscribed).toEqual([])
    expect(result.alreadySubscribed).toEqual([...FITBIT_WEBHOOK_COLLECTIONS])
    expect(result.failed).toEqual([])
  })

  it('records failures for other HTTP errors', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('bad request', { status: 400 }))

    const result = await subscribeFitbitWebhooks('access-token')

    expect(result.failed).toHaveLength(FITBIT_WEBHOOK_COLLECTIONS.length)
    expect(result.failed[0]?.status).toBe(400)
  })
})
