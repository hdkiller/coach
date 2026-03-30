import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trainingPlanRepository } from '../../../../../server/utils/repositories/trainingPlanRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    trainingPlan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  }
}))

describe('trainingPlanRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getActive', () => {
    it('excludes template plans when loading the current active plan', async () => {
      vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null as any)

      await trainingPlanRepository.getActive('user-1')

      expect(prisma.trainingPlan.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          isTemplate: false
        },
        include: undefined,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('archiveAllExcept', () => {
    it('does not archive template records when rotating active plans', async () => {
      vi.mocked(prisma.trainingPlan.updateMany).mockResolvedValue({ count: 1 } as any)

      await trainingPlanRepository.archiveAllExcept('user-1', 'plan-2')

      expect(prisma.trainingPlan.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          isTemplate: false,
          id: { not: 'plan-2' }
        },
        data: {
          status: 'ARCHIVED'
        }
      })
    })
  })
})
