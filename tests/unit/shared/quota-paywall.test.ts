import { describe, expect, it } from 'vitest'
import {
  buildQuotaFeatureDescription,
  buildQuotaUpgradeBullets,
  hasQuotaResetPassed,
  resolveRecommendedUpgradeTier
} from '../../../shared/quota-paywall'

describe('quota paywall helpers', () => {
  it('recommends supporter for free users and pro for supporter users', () => {
    expect(resolveRecommendedUpgradeTier('FREE')).toBe('supporter')
    expect(resolveRecommendedUpgradeTier('SUPPORTER')).toBe('pro')
    expect(resolveRecommendedUpgradeTier('PRO')).toBeUndefined()
  })

  it('recognizes reset boundaries without treating invalid dates as passed', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')

    expect(hasQuotaResetPassed('2026-07-14T11:59:59.000Z', now)).toBe(true)
    expect(hasQuotaResetPassed('2026-07-14T12:00:00.000Z', now)).toBe(true)
    expect(hasQuotaResetPassed('2026-07-14T12:00:01.000Z', now)).toBe(false)
    expect(hasQuotaResetPassed('not-a-date', now)).toBe(false)
    expect(hasQuotaResetPassed(null, now)).toBe(false)
  })

  it('builds accurate chat paywall copy without claiming unlimited usage', () => {
    const description = buildQuotaFeatureDescription({
      featureLabel: 'AI Coach Chat',
      nextTierName: 'Supporter',
      quota: {
        used: 5,
        limit: 5,
        window: '4 hours',
        resetsAt: '2026-07-14T14:30:00.000Z',
        nextTier: 'SUPPORTER',
        nextTierLimit: 50
      }
    })

    expect(description).toContain('5 of 5')
    expect(description).toContain('per 4 hours')
    expect(description).toContain('Supporter includes 50')
    expect(description).not.toContain('unlimited')
  })

  it('never uses unlimited language in chat upgrade bullets', () => {
    const bullets = buildQuotaUpgradeBullets('chat', 'PRO', 500, '4 hours')
    expect(bullets.join(' ').toLowerCase()).not.toContain('unlimited')
  })
})
