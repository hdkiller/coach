import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coachingRepository } from '../../../../../server/utils/repositories/coachingRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn()
  }
}))

describe('coachingRepository.approveCoachingRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conditionally updates on status PENDING inside a transaction (no read-then-write race)', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const findFirst = vi.fn().mockResolvedValue({ id: 'req-1', athleteId: 'athlete-1' })
    const upsert = vi.fn().mockResolvedValue({ coachId: 'coach-1', athleteId: 'athlete-1' })

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        coachingRequest: { updateMany, findFirst },
        coachingRelationship: { upsert }
      })
    )

    await coachingRepository.approveCoachingRequest('coach-1', 'req-1')

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'req-1',
          coachId: 'coach-1',
          status: 'PENDING'
        })
      })
    )
  })

  it('rejects a second concurrent approval once the request is no longer PENDING', async () => {
    // Simulates a double-click race: the second call's conditional update
    // matches zero rows because the first call already flipped the status.
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const findFirst = vi.fn()
    const upsert = vi.fn()

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        coachingRequest: { updateMany, findFirst },
        coachingRelationship: { upsert }
      })
    )

    await expect(coachingRepository.approveCoachingRequest('coach-1', 'req-1')).rejects.toThrow(
      'Request not found'
    )

    // Must not proceed to create/upsert a relationship for an already-handled request.
    expect(upsert).not.toHaveBeenCalled()
  })
})
