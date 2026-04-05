import { describe, expect, it } from 'vitest'
import {
  buildCoachProfileFromLegacy,
  normalizeAthletePublicProfile,
  normalizeCoachPublicProfile,
  resolveCoachPublicProfile
} from '../../../../server/utils/public-presence'

describe('public presence utilities', () => {
  it('builds a coach profile from legacy author fields', () => {
    const profile = buildCoachProfileFromLegacy({
      publicAuthorSlug: 'coach-jane',
      publicDisplayName: 'Coach Jane',
      publicBio: 'Helps marathoners',
      publicLocation: 'Budapest',
      publicWebsiteUrl: 'https://example.com',
      publicSocialLinks: [{ label: 'Instagram', url: 'https://instagram.com/coach' }],
      publicCoachingBrand: 'Summit Endurance',
      visibility: 'Public'
    })

    expect(profile.settings.slug).toBe('coach-jane')
    expect(profile.settings.displayName).toBe('Coach Jane')
    expect(profile.settings.coachingBrand).toBe('Summit Endurance')
    expect(profile.settings.socialLinks).toHaveLength(1)
  })

  it('allows enabled coach profiles without a CTA', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane',
        displayName: 'Coach Jane'
      }
    })

    expect(profile.settings.enabled).toBe(true)
    expect(profile.settings.ctaUrl).toBeUndefined()
  })

  it('upgrades legacy featured plan ids into ordered featured plan meta', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        featuredPlanIds: ['plan-a', 'plan-b']
      }
    })

    expect(profile.settings.featuredPlanMeta).toEqual([
      { planId: 'plan-a', order: 0, highlightWeekId: null, coachNote: null },
      { planId: 'plan-b', order: 1, highlightWeekId: null, coachNote: null }
    ])
  })

  it('normalizes video introduction youtube urls', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      },
      sections: [
        {
          id: 'coach-hero',
          type: 'hero',
          enabled: true,
          order: 0
        },
        {
          id: 'coach-video',
          type: 'videoIntro',
          enabled: true,
          order: 1,
          content: {
            videoUrl: 'https://youtu.be/abc123XYZ98?t=30'
          }
        }
      ]
    })

    expect(
      profile.sections.find((section) => section.type === 'videoIntro')?.content?.videoUrl
    ).toBe('https://www.youtube.com/watch?v=abc123XYZ98')
  })

  it('normalizes coach credibility customization content', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      },
      sections: [
        {
          id: 'coach-hero',
          type: 'hero',
          enabled: true,
          order: 0
        },
        {
          id: 'coach-credibility',
          type: 'credibility',
          enabled: true,
          order: 1,
          content: {
            eyebrow: 'Proof points',
            spotlightTitle: 'Why athletes stay',
            spotlightBody: 'Clear communication and practical feedback.',
            trustBullets: ['Personalized coaching', 'Feedback that fits busy schedules']
          }
        }
      ]
    })

    expect(profile.sections.find((section) => section.type === 'credibility')?.content).toEqual({
      eyebrow: 'Proof points',
      spotlightTitle: 'Why athletes stay',
      spotlightBody: 'Clear communication and practical feedback.',
      trustBullets: ['Personalized coaching', 'Feedback that fits busy schedules'],
      showSpotlight: true,
      showSpecialties: true,
      showCredentials: true,
      showSocialProof: true
    })
  })

  it('restores missing athlete sections from defaults', () => {
    const profile = normalizeAthletePublicProfile({
      settings: {
        enabled: true,
        slug: 'runner-jane'
      },
      sections: []
    })

    expect(profile.sections.some((section) => section.type === 'hero')).toBe(true)
    expect(profile.sections.some((section) => section.type === 'contact')).toBe(true)
    expect(profile.sections.some((section) => section.type === 'links')).toBe(false)
  })

  it('prefers stored coach data while preserving top-level slug state', () => {
    const profile = resolveCoachPublicProfile({
      publicAuthorSlug: 'legacy-jane',
      coachProfileSlug: 'new-jane',
      coachProfileEnabled: true,
      coachPublicPage: {
        settings: {
          enabled: true,
          slug: 'ignored-old',
          displayName: 'Coach Jane',
          ctaUrl: 'https://cal.com/jane'
        }
      }
    })

    expect(profile.settings.slug).toBe('new-jane')
    expect(profile.settings.displayName).toBe('Coach Jane')
    expect(profile.settings.ctaUrl).toBe('https://cal.com/jane')
  })

  it('adds newly introduced default sections to existing stored profiles', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      },
      sections: [
        {
          id: 'coach-hero',
          type: 'hero',
          enabled: true,
          order: 0
        },
        {
          id: 'coach-about',
          type: 'about',
          enabled: true,
          order: 1
        }
      ]
    })

    expect(profile.sections.some((section) => section.type === 'contact')).toBe(true)
    expect(profile.sections.some((section) => section.type === 'socials')).toBe(true)
    expect(profile.sections.some((section) => section.type === 'videoIntro')).toBe(true)
    expect(profile.sections.some((section) => section.type === 'faq')).toBe(true)
  })

  it('restores coach join page defaults for existing profiles', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      }
    })

    expect(profile.joinPage.enabled).toBe(false)
    expect(profile.joinPage.steps).toHaveLength(3)
    expect(profile.joinPage.ctaLabel).toBeNull()
  })

  it('restores coach start page defaults for existing profiles', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      }
    })

    expect(profile.startPage.enabled).toBe(true)
    expect(profile.startPage.sections.some((section) => section.type === 'intakeForm')).toBe(true)
    expect(profile.startPage.sections.some((section) => section.type === 'pricing')).toBe(true)
    expect(profile.startPage.sections.some((section) => section.type === 'noCommitment')).toBe(true)
    expect(profile.startPage.form.fields.length).toBeGreaterThan(0)
    expect(profile.startPage.steps).toHaveLength(3)
    expect(profile.startPage.noCommitmentBullets.length).toBeGreaterThan(0)
    expect(profile.startPage.settings.heroImageUrl).toBeNull()
    expect(profile.startPage.settings.heroImageAlt).toBeNull()
  })

  it('rejects invalid pricing offer urls on the coach start page', () => {
    expect(() =>
      normalizeCoachPublicProfile({
        settings: {
          enabled: true,
          slug: 'coach-jane'
        },
        startPage: {
          sections: [
            { id: 'coach-start-hero', type: 'hero', enabled: true, order: 0 },
            {
              id: 'coach-start-pricing',
              type: 'pricing',
              enabled: true,
              order: 1,
              content: {
                offers: [
                  {
                    id: 'offer-1',
                    name: 'Monthly coaching',
                    priceLabel: '$180',
                    ctaUrl: 'not-a-url'
                  }
                ]
              }
            }
          ]
        }
      })
    ).toThrow(/Pricing section is invalid|valid url|URL/i)
  })

  it('normalizes editable expectations and proof content on the coach start page', () => {
    const profile = normalizeCoachPublicProfile({
      settings: {
        enabled: true,
        slug: 'coach-jane'
      },
      startPage: {
        sections: [
          { id: 'coach-start-hero', type: 'hero', enabled: true, order: 0 },
          {
            id: 'coach-start-expectations',
            type: 'expectations',
            enabled: true,
            order: 1,
            content: {
              eyebrow: 'What happens next'
            }
          },
          {
            id: 'coach-start-proof',
            type: 'proof',
            enabled: true,
            order: 2,
            content: {
              eyebrow: 'Trust',
              body: 'This request goes directly to the coach so they can decide whether the fit is right before starting together.'
            }
          }
        ]
      }
    })

    expect(
      profile.startPage.sections.find((section) => section.type === 'expectations')?.content
    ).toEqual({
      eyebrow: 'What happens next'
    })
    expect(profile.startPage.sections.find((section) => section.type === 'proof')?.content).toEqual(
      {
        eyebrow: 'Trust',
        body: 'This request goes directly to the coach so they can decide whether the fit is right before starting together.'
      }
    )
  })

  it('drops legacy athlete links section when socials is available', () => {
    const profile = normalizeAthletePublicProfile({
      settings: {
        enabled: true,
        slug: 'runner-jane'
      },
      sections: [
        {
          id: 'athlete-hero',
          type: 'hero',
          enabled: true,
          order: 0
        },
        {
          id: 'athlete-links',
          type: 'links',
          enabled: true,
          order: 1
        }
      ]
    })

    expect(profile.sections.find((section) => section.type === 'links')).toBeUndefined()
  })
})
