import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])
vi.stubGlobal('readBody', async (event: any) => event.context?.body || {})

const requireAuth = vi.fn()
const findFirst = vi.fn()
const createCoachingRequestForAthlete = vi.fn()

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth
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
    createCoachingRequestForAthlete
  }
}))

describe('public coach start request endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a coaching request for an authenticated athlete', async () => {
    requireAuth.mockResolvedValue({
      id: 'athlete-1',
      name: 'Athlete One',
      email: 'athlete@example.com',
      image: null
    })
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
          slug: 'coach-jane'
        },
        startPage: {
          form: {
            fields: [
              {
                id: 'goal',
                type: 'longText',
                label: 'Goal',
                required: true
              }
            ]
          }
        }
      }
    })
    createCoachingRequestForAthlete.mockResolvedValue({
      id: 'request-1',
      status: 'PENDING'
    })

    const mod = await import('../../../../../server/api/public/coaches/[slug]/start/request.post')
    const result = await mod.default({
      context: {
        params: { slug: 'coach-jane' },
        body: {
          answers: [
            {
              fieldId: 'goal',
              label: 'Goal',
              type: 'longText',
              answer: 'Race my first marathon'
            }
          ]
        }
      }
    })

    expect(createCoachingRequestForAthlete).toHaveBeenCalledWith(
      expect.objectContaining({
        coachId: 'coach-1',
        athleteId: 'athlete-1'
      })
    )
    expect(result.status).toBe('PENDING')
  })

  it('rejects requests when the coach start page is disabled', async () => {
    requireAuth.mockResolvedValue({
      id: 'athlete-1',
      name: 'Athlete One',
      email: 'athlete@example.com',
      image: null
    })
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
          slug: 'coach-jane'
        },
        startPage: {
          enabled: false
        }
      }
    })

    const mod = await import('../../../../../server/api/public/coaches/[slug]/start/request.post')

    await expect(() =>
      mod.default({
        context: {
          params: { slug: 'coach-jane' },
          body: {
            answers: []
          }
        }
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Coach start page not found.'
    })
  })
})
