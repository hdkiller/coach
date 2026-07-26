import { beforeEach, describe, expect, it, vi } from 'vitest'

const auditLogFindFirst = vi.fn()
const auditLogUpdateMany = vi.fn()
const auditLogUpdate = vi.fn()
const auditLogCreate = vi.fn()

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    auditLog: {
      findFirst: auditLogFindFirst,
      updateMany: auditLogUpdateMany,
      update: auditLogUpdate
    }
  }
}))

vi.mock('../../../../server/utils/repositories/auditLogRepository', () => ({
  auditLogRepository: {
    log: auditLogCreate
  }
}))

describe('recordAccountCreated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    vi.stubEnv('NUXT_PUBLIC_GTAG_ID', '')
    vi.stubEnv('NUXT_GA_MEASUREMENT_API_SECRET', '')
    auditLogCreate.mockResolvedValue({ id: 'log-1' })
    auditLogUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('creates an audit log only once per user', async () => {
    auditLogFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'log-1' })

    const { recordAccountCreated } = await import('../../../../server/utils/product-analytics')

    const first = await recordAccountCreated('user-1', 'google')
    const second = await recordAccountCreated('user-1', 'google')

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(auditLogCreate).toHaveBeenCalledTimes(1)
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'ACCOUNT_CREATED',
        metadata: expect.objectContaining({ method: 'google' })
      })
    )
  })

  it('uses G- measurement ID fallback for MP call when GTAG_ID is GTM', async () => {
    vi.stubEnv('NUXT_PUBLIC_GTAG_ID', 'GTM-WVHG7LMQ')
    vi.stubEnv('NUXT_GA_MEASUREMENT_API_SECRET', 'test_secret')
    auditLogFindFirst.mockResolvedValueOnce(null)

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    const { recordAccountCreated } = await import('../../../../server/utils/product-analytics')
    const result = await recordAccountCreated('user-2', 'google')

    expect(result.ga4ServerSent).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('measurement_id=G-M3CJW4RW5S'),
      expect.anything()
    )
  })
})

describe('claimAccountCreatedForClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditLogUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('returns claim data when server-side GA4 was not sent', async () => {
    auditLogFindFirst.mockResolvedValue({
      id: 'log-1',
      metadata: {
        method: 'strava',
        entry_point: 'oauth',
        ga4_server_sent: false,
        ga4_client_claimed: false
      }
    })

    const { claimAccountCreatedForClient } =
      await import('../../../../server/utils/product-analytics')
    const result = await claimAccountCreatedForClient('user-1')

    expect(result).toEqual({
      claim: true,
      method: 'strava',
      entry_point: 'oauth'
    })
    expect(auditLogUpdateMany).toHaveBeenCalled()
  })

  it('does not claim when server-side GA4 already reserved the send', async () => {
    auditLogFindFirst.mockResolvedValue({
      id: 'log-1',
      metadata: {
        method: 'strava',
        entry_point: 'oauth',
        ga4_server_sent: true,
        ga4_client_claimed: false
      }
    })
    auditLogUpdateMany.mockResolvedValue({ count: 0 })

    const { claimAccountCreatedForClient } =
      await import('../../../../server/utils/product-analytics')
    const result = await claimAccountCreatedForClient('user-1')

    expect(result).toEqual({ claim: false })
  })
})
