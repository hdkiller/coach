import { describe, expect, it } from 'vitest'
import { shouldIngestActivities } from '../../../../server/utils/integration-settings'

describe('Liftosaur integration settings', () => {
  it('defaults workout ingestion to enabled before a preference is configured', () => {
    expect(shouldIngestActivities('liftosaur', false, {})).toBe(true)
  })

  it('respects the configured workout-ingestion preference', () => {
    expect(shouldIngestActivities('liftosaur', false, { activityPreferenceConfigured: true })).toBe(
      false
    )
  })
})
