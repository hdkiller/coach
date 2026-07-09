import { describe, expect, it } from 'vitest'
import { isIntegrationConnected } from '../../../app/utils/integrations'

describe('isIntegrationConnected', () => {
  const integrations = [
    { provider: 'whoop', syncStatus: 'SUCCESS' },
    { provider: 'withings', syncStatus: 'FAILED' },
    { provider: 'garmin', syncStatus: 'SYNCING' }
  ]

  it('returns false when provider is missing', () => {
    expect(isIntegrationConnected(integrations, 'strava')).toBe(false)
    expect(isIntegrationConnected(null, 'whoop')).toBe(false)
  })

  it('returns false when syncStatus is FAILED', () => {
    expect(isIntegrationConnected(integrations, 'withings')).toBe(false)
  })

  it('returns true for active integrations', () => {
    expect(isIntegrationConnected(integrations, 'whoop')).toBe(true)
    expect(isIntegrationConnected(integrations, 'garmin')).toBe(true)
  })
})
