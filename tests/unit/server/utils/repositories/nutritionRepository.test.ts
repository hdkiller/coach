import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nutritionRepository } from '../../../../../server/utils/repositories/nutritionRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    nutrition: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}))

describe('nutritionRepository', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPendingAnalysis', () => {
    it('includes QUOTA_EXCEEDED alongside the other pending statuses so rate-limited records are re-processed', async () => {
      vi.mocked(prisma.nutrition.findMany).mockResolvedValue([])

      await nutritionRepository.getPendingAnalysis(userId)

      expect(prisma.nutrition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            OR: expect.arrayContaining([
              { aiAnalysisStatus: null },
              { aiAnalysisStatus: 'NOT_STARTED' },
              { aiAnalysisStatus: 'PENDING' },
              { aiAnalysisStatus: 'FAILED' },
              { aiAnalysisStatus: 'QUOTA_EXCEEDED' }
            ])
          })
        })
      )
    })

    it('scopes to an end date when provided', async () => {
      vi.mocked(prisma.nutrition.findMany).mockResolvedValue([])
      const endDate = new Date('2026-01-01')

      await nutritionRepository.getPendingAnalysis(userId, endDate)

      expect(prisma.nutrition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            date: { lte: endDate }
          })
        })
      )
    })
  })
})
