import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])

const findFirst = vi.fn()
const getActivePublicAthleteInviteForCoach = vi.fn()

vi.mock('#auth', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'coach-1' } }))
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findFirst
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/coachingRepository', () => ({
  coachingRepository: {
    getActivePublicAthleteInviteForCoach
  }
}))

describe('public coach join endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns branded coach join data with active invite info', async () => {
    findFirst.mockResolvedValue({
      id: 'coach-1',
      name: 'Coach Jane',
      email: 'jane@example.com',
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
          coachingBrand: 'Summit',
          specialties: ['Marathon']
        },
        testimonials: [
          {
            id: 'testimonial-1',
            quote: 'Great coach.',
            authorName: 'Athlete A'
          }
        ],
        joinPage: {
          enabled: true,
          headline: 'Join Coach Jane',
          ctaLabel: 'Join now'
        }
      }
    })
    getActivePublicAthleteInviteForCoach.mockResolvedValue({
      id: 'invite-1',
      code: 'ABC12345',
      expiresAt: new Date('2026-04-10T00:00:00Z')
    })

    const mod = await import('../../../../../server/api/public/coaches/[slug]/join.get')
    const result = await mod.default({ context: { params: { slug: 'coach-jane' } } })

    expect(result.fallbackToGenericJoin).toBe(false)
    expect(result.join.activeInviteCode).toBe('ABC12345')
    expect(result.join.joinPage.headline).toBe('Join Coach Jane')
    expect(result.join.proof.specialties).toEqual(['Marathon'])
  })
})
