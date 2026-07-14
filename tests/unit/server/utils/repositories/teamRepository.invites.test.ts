import { beforeEach, describe, expect, it, vi } from 'vitest'
import { teamRepository } from '../../../../../server/utils/repositories/teamRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    teamInvite: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}))

describe('teamRepository.acceptInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts email-restricted invites with case-insensitive email match', async () => {
    vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue({
      id: 'invite-1',
      teamId: 'team-1',
      email: 'john@example.com',
      role: 'ATHLETE',
      groupId: null,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      code: 'ABCDEFGH12'
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'John@Example.com'
    } as any)

    const update = vi.fn()
    const upsert = vi.fn().mockResolvedValue({ teamId: 'team-1', userId: 'user-1' })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        teamMember: { upsert },
        teamInvite: { update }
      })
    )

    await teamRepository.acceptInvite('user-1', 'ABCDEFGH12')

    expect(update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: { status: 'ACCEPTED' }
    })
  })

  it('keeps public team invites pending after accept', async () => {
    vi.mocked(prisma.teamInvite.findUnique).mockResolvedValue({
      id: 'invite-2',
      teamId: 'team-1',
      email: null,
      role: 'ATHLETE',
      groupId: null,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      code: 'PUBLICCODE1'
    } as any)

    const update = vi.fn()
    const upsert = vi.fn().mockResolvedValue({ teamId: 'team-1', userId: 'user-2' })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        teamMember: { upsert },
        teamInvite: { update }
      })
    )

    await teamRepository.acceptInvite('user-2', 'PUBLICCODE1')

    expect(update).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalled()
  })
})
