import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])

const findFirst = vi.fn()
const findMany = vi.fn()

vi.mock('#auth', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'athlete-1' } }))
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findFirst
    }
  }
}))

describe('public coach start endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).prisma = undefined
  })

  it('returns branded coach start data with viewer context', async () => {
    const prismaModule = await import('../../../../../server/utils/db')
    ;(prismaModule.prisma as any).coachingRelationship = {
      findMany
    }

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
        startPage: {
          settings: {
            headline: 'Start with Coach Jane'
          }
        }
      }
    })
    findMany.mockResolvedValue([
      {
        coach: {
          id: 'coach-2',
          name: 'Other Coach',
          email: 'other@example.com'
        }
      }
    ])

    const mod = await import('../../../../../server/api/public/coaches/[slug]/start.get')
    const result = await mod.default({ context: { params: { slug: 'coach-jane' } } })

    expect(result.viewer.isAuthenticated).toBe(true)
    expect(result.viewer.hasActiveCoach).toBe(true)
    expect(result.start.startPage.settings.headline).toBe('Start with Coach Jane')
    expect(result.start.proof.specialties).toEqual(['Marathon'])
  })
})
