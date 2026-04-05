import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => undefined)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])

const teamInviteFindUnique = vi.fn()
const coachingInviteFindUnique = vi.fn()
const userFindUnique = vi.fn()
const getCoachAthleteInviteByCode = vi.fn()

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    teamInvite: { findUnique: teamInviteFindUnique },
    coachingInvite: { findUnique: coachingInviteFindUnique },
    user: { findUnique: userFindUnique }
  }
}))

vi.mock('../../../../server/utils/repositories/coachingRepository', () => ({
  coachingRepository: {
    getCoachAthleteInviteByCode
  }
}))

describe('join code endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    teamInviteFindUnique.mockResolvedValue(null)
    coachingInviteFindUnique.mockResolvedValue(null)
  })

  it('returns branded coach join data for coach-generated athlete invites', async () => {
    getCoachAthleteInviteByCode.mockResolvedValue({
      id: 'invite-1',
      coachId: 'coach-1',
      code: 'ABC12345',
      status: 'PENDING',
      expiresAt: new Date('2026-04-10T00:00:00Z'),
      email: null,
      coach: {
        id: 'coach-1',
        name: 'Coach Jane',
        email: 'jane@example.com',
        image: null
      }
    })
    userFindUnique.mockResolvedValue({
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
          displayName: 'Coach Jane'
        },
        joinPage: {
          enabled: true,
          headline: 'Join Coach Jane'
        }
      }
    })

    const mod = await import('../../../../server/api/join/[code].get')
    const result = await mod.default({ context: { params: { code: 'abc12345' } } })

    expect(result.type).toBe('ATHLETE_INVITE')
    expect(result.coachJoin.coach.name).toBe('Coach Jane')
    expect(result.coachJoin.joinPage.headline).toBe('Join Coach Jane')
    expect(result.coachJoin.activeInviteCode).toBe('ABC12345')
  })
})
