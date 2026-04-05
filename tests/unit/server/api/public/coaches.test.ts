import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])

const findFirst = vi.fn()

vi.mock('#auth', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'user-1' } }))
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findFirst
    }
  }
}))

function makePlan(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    slug: `plan-${id}`,
    name: `Plan ${id}`,
    publicHeadline: `Headline ${id}`,
    publicDescription: `Description ${id}`,
    primarySport: 'RUNNING',
    sportSubtype: 'Marathon',
    skillLevel: 'BEGINNER',
    planLanguage: 'English',
    daysPerWeek: 4,
    weeklyVolumeBand: 'MEDIUM',
    goalLabel: null,
    difficulty: 4,
    accessState: 'FREE',
    visibility: 'PUBLIC',
    isFeatured: false,
    equipmentTags: [],
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    createdAt: new Date('2026-04-01T00:00:00Z'),
    user: {
      name: 'Coach Jane',
      image: null,
      publicAuthorSlug: 'legacy-jane',
      publicDisplayName: 'Coach Jane',
      publicBio: 'Bio',
      publicLocation: 'Budapest',
      publicWebsiteUrl: 'https://example.com',
      publicSocialLinks: [],
      publicCoachingBrand: 'Summit',
      coachProfileSlug: 'coach-jane',
      coachPublicPage: {
        settings: {
          enabled: true,
          slug: 'coach-jane',
          displayName: 'Coach Jane',
          ctaUrl: 'https://cal.com/jane',
          featuredPlanMeta: [
            {
              planId: 'plan-featured',
              order: 0,
              highlightWeekId: 'w1',
              coachNote: 'Best for first-time marathoners.'
            }
          ]
        }
      }
    },
    blocks: [{ id: 'b1', weeks: [{ id: 'w1' }] }],
    ...overrides
  }
}

describe('public coach endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supports legacy slug lookup and splits featured plans', async () => {
    findFirst.mockResolvedValue({
      id: 'user-1',
      name: 'Coach Jane',
      image: null,
      visibility: 'Public',
      publicAuthorSlug: 'legacy-jane',
      publicDisplayName: 'Coach Jane',
      publicBio: 'Bio',
      publicLocation: 'Budapest',
      publicWebsiteUrl: 'https://example.com',
      publicSocialLinks: [],
      publicCoachingBrand: 'Summit',
      coachProfileEnabled: true,
      coachProfileSlug: 'coach-jane',
      coachPublicPage: {
        settings: {
          enabled: true,
          slug: 'coach-jane',
          displayName: 'Coach Jane',
          ctaUrl: 'https://cal.com/jane',
          featuredPlanMeta: [
            {
              planId: 'plan-featured',
              order: 0,
              highlightWeekId: 'w1',
              coachNote: 'Best for first-time marathoners.'
            }
          ]
        }
      },
      trainingPlans: [makePlan('plan-featured'), makePlan('plan-other')]
    })

    const mod = await import('../../../../../server/api/public/coaches/[slug].get')
    const result = await mod.default({ context: { params: { slug: 'legacy-jane' } } })

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array)
        })
      })
    )
    expect(result.viewer.isOwner).toBe(true)
    expect(result.profile.settings.slug).toBe('coach-jane')
    expect(result.featuredPlans).toHaveLength(1)
    expect(result.featuredPlans[0].highlightedSampleWeekId).toBe('w1')
    expect(result.featuredPlans[0].coachNote).toBe('Best for first-time marathoners.')
    expect(result.remainingPlans).toHaveLength(1)
  })
})
