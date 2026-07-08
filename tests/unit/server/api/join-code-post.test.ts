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
const acceptInvite = vi.fn()
const connectAthleteWithCode = vi.fn()
const acceptAthleteInviteForCoach = vi.fn()
const getCoachAthleteInviteByCode = vi.fn()

vi.mock('../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'wrong@example.com' })
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    teamInvite: { findUnique: teamInviteFindUnique },
    coachingInvite: { findUnique: coachingInviteFindUnique }
  }
}))

vi.mock('../../../../server/utils/repositories/teamRepository', () => ({
  teamRepository: { acceptInvite }
}))

vi.mock('../../../../server/utils/repositories/coachingRepository', () => ({
  coachingRepository: {
    connectAthleteWithCode,
    acceptAthleteInviteForCoach,
    getCoachAthleteInviteByCode
  }
}))

const futureDate = new Date('2026-12-31T00:00:00Z')

describe('POST /api/join/[code]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    teamInviteFindUnique.mockResolvedValue(null)
    coachingInviteFindUnique.mockResolvedValue(null)
    getCoachAthleteInviteByCode.mockResolvedValue(null)
  })

  it('maps team invite email mismatch to 403', async () => {
    teamInviteFindUnique.mockResolvedValue({
      code: 'TEAM1234',
      status: 'PENDING',
      expiresAt: futureDate
    })
    acceptInvite.mockRejectedValue(new Error('This invite is restricted to another email address'))

    const mod = await import('../../../../server/api/join/[code].post')
    const handler = mod.default

    await expect(
      handler({ context: { params: { code: 'team1234' } } } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'This invite is restricted to another email address'
    })
  })

  it('maps athlete invite validation errors to 4xx', async () => {
    getCoachAthleteInviteByCode.mockResolvedValue({
      status: 'PENDING',
      expiresAt: futureDate
    })
    acceptAthleteInviteForCoach.mockRejectedValue(new Error('You cannot invite yourself'))

    const mod = await import('../../../../server/api/join/[code].post')
    const handler = mod.default

    await expect(
      handler({ context: { params: { code: 'athlete1' } } } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'You cannot invite yourself'
    })
  })
})
