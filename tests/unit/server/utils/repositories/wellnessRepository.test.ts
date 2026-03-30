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

    it('should NOT record a history entry when the only repeated field is an unchanged date', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
        id: '1',
        userId,
        date,
        history: []
      } as any)

      await wellnessRepository.upsert(
        userId,
        date,
        { userId, date } as any,
        { date: new Date('2024-01-31T00:00:00Z') } as any,
        'intervals'
      )

      const upsertCall = vi.mocked(prisma.wellness.upsert).mock.calls[0][0]
      expect(upsertCall.update).not.toHaveProperty('history')
    })

    it('should normalize vo2Max to vo2max before calling Prisma', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue(null)

      await wellnessRepository.upsert(
        userId,
        date,
        { userId, date, vo2Max: 54.2 } as any,
        { vo2Max: 54.2 } as any,
        'garmin'
      )

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            vo2max: 54.2
          }),
          update: expect.objectContaining({
            vo2max: 54.2
          })
        })
      )

      const upsertCall = vi.mocked(prisma.wellness.upsert).mock.calls[0][0]
      expect(upsertCall.create).not.toHaveProperty('vo2Max')
      expect(upsertCall.update).not.toHaveProperty('vo2Max')
    })

    it('should normalize fractional spO2 values to percentages before calling Prisma', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue(null)

      await wellnessRepository.upsert(
        userId,
        date,
        { userId, date, spO2: 1 } as any,
        { spO2: 0.976 } as any,
        'apple_health'
      )

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            spO2: 100
          }),
          update: expect.objectContaining({
            spO2: 97.6
          })
        })
      )
    })

    it('should clear explicitly configured nullable fields when the source sends them blank', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
        id: '1',
        userId,
        date,
        stress: 10,
        fatigue: 7,
        history: []
      } as any)

      await wellnessRepository.upsert(
        userId,
        date,
        { userId, date, stress: null, fatigue: null } as any,
        { stress: null, fatigue: null } as any,
        'intervals',
        { clearFields: ['stress', 'fatigue'] }
      )

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            stress: null,
            fatigue: null,
            history: expect.arrayContaining([
              expect.objectContaining({
                source: 'intervals',
                changes: {
                  stress: { old: 10, new: null },
                  fatigue: { old: 7, new: null }
                }
              })
            ])
          })
        })
      )
    })

    it('should replace rawJson when configured for full-snapshot providers', async () => {
      vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
        id: '1',
        userId,
        date,
        rawJson: {
          stress: 4,
          fatigue: 2,
          readiness: 83
        },
        history: []
      } as any)

      await wellnessRepository.upsert(
        userId,
        date,
        { userId, date, rawJson: { readiness: 81 } } as any,
        { rawJson: { readiness: 81 } } as any,
        'intervals',
        { replaceRawJson: true }
      )

      expect(prisma.wellness.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            rawJson: {
              readiness: 81
            }
          })
        })
      )
    })
  })
})
