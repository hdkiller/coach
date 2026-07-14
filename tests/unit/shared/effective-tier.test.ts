import { describe, expect, it } from 'vitest'
import { resolveEffectiveTier } from '../../../shared/effective-tier'

const now = new Date('2026-07-14T12:00:00.000Z')

describe('resolveEffectiveTier', () => {
  it('returns FREE for users without paid access, trial, or grants', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        trialEndsAt: null,
        promotionalGrantTier: null,
        now
      })
    ).toBe('FREE')
  })

  it('maps active signup trial to SUPPORTER for FREE users', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        trialEndsAt: new Date('2026-08-01T00:00:00.000Z'),
        promotionalGrantTier: null,
        now
      })
    ).toBe('SUPPORTER')
  })

  it('ignores expired trials automatically', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        trialEndsAt: new Date('2026-06-01T00:00:00.000Z'),
        promotionalGrantTier: null,
        now
      })
    ).toBe('FREE')
  })

  it('preserves active paid SUPPORTER subscriptions', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'SUPPORTER',
        subscriptionStatus: 'ACTIVE',
        subscriptionPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        promotionalGrantTier: null,
        now
      })
    ).toBe('SUPPORTER')
  })

  it('preserves active paid PRO subscriptions', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        promotionalGrantTier: null,
        now
      })
    ).toBe('PRO')
  })

  it('upgrades FREE users with an active PRO promotional grant', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        trialEndsAt: null,
        promotionalGrantTier: 'PRO',
        now
      })
    ).toBe('PRO')
  })

  it('upgrades paid SUPPORTER users with a higher PRO promotional grant', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'SUPPORTER',
        subscriptionStatus: 'ACTIVE',
        subscriptionPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        promotionalGrantTier: 'PRO',
        now
      })
    ).toBe('PRO')
  })

  it('never downgrades paid PRO users when a promotional grant expires', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        promotionalGrantTier: null,
        now
      })
    ).toBe('PRO')
  })

  it('chooses the highest valid tier across trial and promotional grant', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        trialEndsAt: new Date('2026-08-01T00:00:00.000Z'),
        promotionalGrantTier: 'PRO',
        now
      })
    ).toBe('PRO')
  })

  it('honors canceled subscriptions during grace period', () => {
    expect(
      resolveEffectiveTier({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'CANCELED',
        subscriptionPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
        trialEndsAt: null,
        promotionalGrantTier: null,
        now
      })
    ).toBe('PRO')
  })
})
