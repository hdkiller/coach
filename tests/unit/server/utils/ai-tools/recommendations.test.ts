import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recommendationTools } from '../../../../../server/utils/ai-tools/recommendations'
import { recommendationRepository } from '../../../../../server/utils/repositories/recommendationRepository'
import { activityRecommendationRepository } from '../../../../../server/utils/repositories/activityRecommendationRepository'

vi.mock('../../../../../server/utils/repositories/recommendationRepository', () => ({
  recommendationRepository: {
    findById: vi.fn(),
    list: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/activityRecommendationRepository', () => ({
  activityRecommendationRepository: {
    findToday: vi.fn()
  }
}))

describe('recommendationTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = recommendationTools(userId, timezone)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue(null)
    vi.mocked(recommendationRepository.list).mockResolvedValue([])
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
        success: false,
        next_action: expect.stringContaining('create_planned_workout')
      })
    )
  })

  it('returns today activity recommendation when available', async () => {
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue({
      id: 'act-rec-1',
      recommendation: 'proceed',
      confidence: 0.9,
      reasoning: 'Readiness is good.',
      status: 'COMPLETED',
      analysisJson: null,
      plannedWorkout: {
        id: 'pw-1',
        title: 'Easy Run',
        type: 'Run',
        durationSec: 3600,
        tss: 45,
        description: 'Zone 2 aerobic run.'
      }
    } as any)

    const result = await tools.recommend_workout.execute(
      { day_of_week: 2 },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result.recommendation).toEqual(
      expect.objectContaining({
        source: 'activity_recommendation',
        title: 'Easy Run',
        type: 'Run',
        planned_workout_id: 'pw-1'
      })
    )
  })

  it('does not default the sport type to Ride when the planned workout has no type set', async () => {
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue({
      id: 'act-rec-2',
      recommendation: 'proceed',
      confidence: 0.8,
      reasoning: 'Readiness is good.',
      status: 'COMPLETED',
      analysisJson: null,
      plannedWorkout: {
        id: 'pw-2',
        title: 'Untyped session',
        type: null,
        durationSec: 1800,
        tss: 30,
        description: null
      }
    } as any)

    const result = await tools.recommend_workout.execute(
      { day_of_week: 3 },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result.recommendation).toEqual(
      expect.objectContaining({
        source: 'activity_recommendation',
        title: 'Untyped session',
        type: undefined,
        planned_workout_id: 'pw-2'
      })
    )
  })

  it('derives the sport type from the suggested_modifications.new_type field for a running suggestion', async () => {
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue({
      id: 'act-rec-3',
      recommendation: 'modify',
      confidence: 0.7,
      reasoning: 'Fatigue detected, suggest an easier run instead.',
      status: 'COMPLETED',
      plannedWorkout: null,
      analysisJson: {
        suggested_modifications: {
          action: 'modify',
          new_title: 'Recovery Run',
          new_type: 'Run',
          new_tss: 25,
          new_duration_min: 40,
          zone_adjustments: 'Zone 1-2 only',
          description: 'Easy recovery run.'
        }
      }
    } as any)

    const result = await tools.recommend_workout.execute(
      { day_of_week: 4 },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result.recommendation).toEqual(
      expect.objectContaining({
        source: 'activity_recommendation',
        title: 'Recovery Run',
        type: 'Run'
      })
    )
  })

  it('maps a Gym suggestion to the WeightTraining sport type instead of defaulting to Ride', async () => {
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue({
      id: 'act-rec-4',
      recommendation: 'modify',
      confidence: 0.7,
      reasoning: 'Suggest strength training instead.',
      status: 'COMPLETED',
      plannedWorkout: null,
      analysisJson: {
        suggested_modifications: {
          action: 'modify',
          new_title: 'Strength Session',
          new_type: 'Gym',
          new_tss: 20,
          new_duration_min: 45,
          zone_adjustments: '',
          description: 'Strength training session.'
        }
      }
    } as any)

    const result = await tools.recommend_workout.execute(
      { day_of_week: 6 },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result.recommendation).toEqual(
      expect.objectContaining({
        source: 'activity_recommendation',
        title: 'Strength Session',
        type: 'WeightTraining'
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
