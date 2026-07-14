import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coachingRepository } from '../../../../../server/utils/repositories/coachingRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn()
    }
  }
}))

describe('coachingRepository.acceptAthleteInviteForCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps public coach invites pending after accept', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: 'invite-public',
        coachId: 'coach-1',
        email: null,
        code: 'PUBLICCOACH',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
        acceptedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        coach_id: 'coach-1',
        coach_name: 'Coach',
        coach_email: 'coach@example.com',
        coach_image: null
      }
    ] as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'athlete-1',
      email: 'athlete@example.com'
    } as any)

    const executeRaw = vi.fn()
    const upsert = vi.fn().mockResolvedValue({ coachId: 'coach-1', athleteId: 'athlete-1' })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        coachingRelationship: { upsert },
        $executeRaw: executeRaw
      })
    )

    await coachingRepository.acceptAthleteInviteForCoach('athlete-1', 'PUBLICCOACH')

    expect(upsert).toHaveBeenCalled()
    const sql = executeRaw.mock.calls[0][0].strings.join('')
    expect(sql).toContain('UPDATE "CoachAthleteInvite"')
    expect(sql).not.toContain('"status" = \'ACCEPTED\'')
  })
})
