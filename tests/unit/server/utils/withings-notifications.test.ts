import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  isWithingsWebhookVerification,
  subscribeWithingsWebhooks,
  WITHINGS_NOTIFICATION_APPLIS
} from '../../../../server/utils/withings-notifications'

describe('isWithingsWebhookVerification', () => {
  it('detects empty-body verification POSTs', () => {
    expect(
      isWithingsWebhookVerification({}, { 'content-length': '0', host: 'coachwatts.com' })
    ).toBe(true)
  })

  it('detects empty params without notification fields', () => {
    expect(isWithingsWebhookVerification({}, {})).toBe(true)
  })

  it('does not treat data notifications as verification', () => {
    expect(
      isWithingsWebhookVerification(
        { userid: '12345', appli: '1', startdate: '1710000000', enddate: '1710086400' },
        { 'content-length': '64' }
      )
    ).toBe(false)
  })

  it('does not treat notifications missing userid but with appli as verification', () => {
    expect(isWithingsWebhookVerification({ appli: '1' }, { 'content-length': '8' })).toBe(false)
  })
})

describe('subscribeWithingsWebhooks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('subscribes to weight, activity, and sleep notifications', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const result = await subscribeWithingsWebhooks(
      'access-token',
      'https://coachwatts.com/api/integrations/withings/webhook'
    )

    expect(result.subscribed).toEqual([...WITHINGS_NOTIFICATION_APPLIS])
    expect(result.failed).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(WITHINGS_NOTIFICATION_APPLIS.length)
  })

  it('records API failures', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: 293, error: 'invalid callback' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const result = await subscribeWithingsWebhooks(
      'access-token',
      'https://coachwatts.com/api/integrations/withings/webhook'
    )

    expect(result.subscribed).toEqual([])
    expect(result.failed).toHaveLength(WITHINGS_NOTIFICATION_APPLIS.length)
    expect(result.failed[0]?.status).toBe(293)
  })
})
