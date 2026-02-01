import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wellnessRepository } from '../../../../../server/utils/repositories/wellnessRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    wellness: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn()
    }
  }
}))

describe('wellnessRepository', () => {
  const userId = 'user-123'
  const date = new Date('2024-01-31T00:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('upsert', () => {
    it('should create initial history when no existing record found', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue(null)

      const createData = { userId, date, restingHr: 60 }
      const updateData = { restingHr: 60 }

      await wellnessRepository.upsert(
        userId,
        date,
        createData as any,
        updateData as any,
        'intervals'
      )

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            history: expect.arrayContaining([
              expect.objectContaining({
                source: 'intervals',
                changes: 'created'
              })
            ])
          })
        })
      )
    })

    it('should append changes to history when updating', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
        id: '1',
        userId,
        date,
        restingHr: 60,
        history: [
          { timestamp: '2024-01-30T00:00:00.000Z', source: 'intervals', changes: 'created' }
        ]
      } as any)

      const createData = { userId, date, restingHr: 65 }
      const updateData = { restingHr: 65 } // Changed from 60

      await wellnessRepository.upsert(userId, date, createData as any, updateData as any, 'oura')

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            history: expect.arrayContaining([
              expect.objectContaining({ source: 'intervals', changes: 'created' }),
              expect.objectContaining({
                source: 'oura',
                changes: {
                  restingHr: { old: 60, new: 65 }
                }
              })
            ])
          })
        })
      )
    })

    it('should NOT update history if no changes detected', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
        id: '1',
        userId,
        date,
        restingHr: 60,
        history: []
      } as any)

      const updateData = { restingHr: 60 } // Same value

      await wellnessRepository.upsert(userId, date, {} as any, updateData as any, 'polar')

      // Update payload should NOT contain 'history'
      const upsertCall = vi.mocked(prisma.wellness.upsert).mock.calls[0][0]
      expect(upsertCall.update).not.toHaveProperty('history')
    })
  })
})
