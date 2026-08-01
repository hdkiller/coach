import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchWithingsActivities,
  fetchWithingsIntraday,
  fetchWithingsMeasures,
  fetchWithingsSleep,
  fetchWithingsWorkouts
} from '../../../../server/utils/withings'
import { IntegrationProviderError } from '../../../../server/utils/integration-errors'

// A token that is not expired so ensureValidToken() never needs to hit the DB.
const integration = {
  id: 'integration-withings-rate-limit',
  accessToken: 'valid-token',
  refreshToken: 'valid-refresh-token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000)
} as any

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('Withings status 601 (rate limit)', () => {
  it('fetchWithingsMeasures throws a retryable IntegrationProviderError, not a generic Error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 601, body: {} }))

    const error = await fetchWithingsMeasures(
      integration,
      new Date('2024-01-01'),
      new Date('2024-01-02')
    ).catch((err) => err)

    expect(error).toBeInstanceOf(IntegrationProviderError)
    expect(error).toMatchObject({
      name: 'IntegrationProviderError',
      provider: 'withings',
      integrationId: integration.id,
      statusCode: 601,
      retryable: true
    })
  })

  it('fetchWithingsActivities throws a retryable IntegrationProviderError on status 601', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 601, body: {} }))

    await expect(
      fetchWithingsActivities(integration, new Date('2024-01-01'), new Date('2024-01-02'))
    ).rejects.toBeInstanceOf(IntegrationProviderError)
  })

  it('fetchWithingsWorkouts throws a retryable IntegrationProviderError on status 601', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 601, body: {} }))

    await expect(
      fetchWithingsWorkouts(integration, new Date('2024-01-01'), new Date('2024-01-02'))
    ).rejects.toBeInstanceOf(IntegrationProviderError)
  })

  it('fetchWithingsIntraday throws a retryable IntegrationProviderError on status 601', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 601, body: {} }))

    await expect(
      fetchWithingsIntraday(integration, new Date('2024-01-01'), new Date('2024-01-02'))
    ).rejects.toBeInstanceOf(IntegrationProviderError)
  })

  it('fetchWithingsSleep throws a retryable IntegrationProviderError on status 601', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 601, body: {} }))

    await expect(
      fetchWithingsSleep(integration, new Date('2024-01-01'), new Date('2024-01-02'))
    ).rejects.toBeInstanceOf(IntegrationProviderError)
  })

  it('still throws a plain Error for other non-zero, non-rate-limit statuses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 100, body: {} }))

    const error = await fetchWithingsMeasures(
      integration,
      new Date('2024-01-01'),
      new Date('2024-01-02')
    ).catch((err) => err)

    expect(error).not.toBeInstanceOf(IntegrationProviderError)
    expect(String(error.message)).toContain('Status 100')
  })
})
