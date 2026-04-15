import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recommendationTools } from '../../../../../server/utils/ai-tools/recommendations'
import { recommendationRepository } from '../../../../../server/utils/repositories/recommendationRepository'

vi.mock('../../../../../server/utils/repositories/recommendationRepository', () => ({
  recommendationRepository: {
    findById: vi.fn(),
    list: vi.fn()
  }
}))

describe('recommendationTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = recommendationTools(userId, timezone)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('makes workout recommendations explicit that they are not scheduled or synced', async () => {
    const tools = recommendationTools('user-1', 'Europe/Budapest')

    const result = await tools.recommend_workout.execute(
      {
        day_of_week: 5,
        bike_access: true,
        indoor_only: true,
        notes: 'Testing MyWhoosh sync'
      },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        synced: false,
        next_action: expect.stringContaining('create_planned_workout')
      })
    )
  })

  describe('get_recommendation_details', () => {
    it('should return details when found', async () => {
      const mockRec = { id: 'rec1', userId, status: 'ACTIVE' }
      vi.mocked(recommendationRepository.findById).mockResolvedValue(mockRec as any)

      const result = await tools.get_recommendation_details.execute(
        { recommendation_id: 'rec1' },
        { toolCallId: '1', messages: [] }
      )

      expect(recommendationRepository.findById).toHaveBeenCalledWith('rec1', userId)
      expect(result).toEqual(mockRec)
    })

    it('should return error when not found', async () => {
      vi.mocked(recommendationRepository.findById).mockResolvedValue(null)

      const result = await tools.get_recommendation_details.execute(
        { recommendation_id: 'rec1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Recommendation not found' })
    })
  })

  describe('list_pending_recommendations', () => {
    it('should return list of recommendations', async () => {
      const mockRecs = [
        { id: 'rec1', priority: 'HIGH' },
        { id: 'rec2', priority: 'LOW' }
      ]
      vi.mocked(recommendationRepository.list).mockResolvedValue(mockRecs as any)

      const result = await tools.list_pending_recommendations.execute(
        { status: 'ACTIVE' },
        { toolCallId: '1', messages: [] }
      )

      expect(recommendationRepository.list).toHaveBeenCalledWith(userId, {
        status: 'ACTIVE',
        limit: 5
      })
      expect(result).toEqual({ count: 2, recommendations: mockRecs })
    })

    it('should filter by priority manually', async () => {
      const mockRecs = [
        { id: 'rec1', priority: 'HIGH' },
        { id: 'rec2', priority: 'LOW' }
      ]
      vi.mocked(recommendationRepository.list).mockResolvedValue(mockRecs as any)

      const result = await tools.list_pending_recommendations.execute(
        { status: 'ACTIVE', priority: 'HIGH' },
        { toolCallId: '1', messages: [] }
      )

      expect(result.recommendations).toHaveLength(1)
      expect(result.recommendations[0].priority).toBe('HIGH')
    })
  })
})
