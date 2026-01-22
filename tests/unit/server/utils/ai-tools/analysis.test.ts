import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analysisTools } from '../../../../../server/utils/ai-tools/analysis'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'

// Mock the repository
vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn()
  }
}))

describe('analysisTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = analysisTools(userId, timezone)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyze_training_load', () => {
    it('should calculate aggregated metrics', async () => {
      const mockWorkouts = [
        { tss: 50, durationSec: 3600 },
        { tss: 100, durationSec: 7200 }
      ]
      vi.mocked(workoutRepository.getForUser).mockResolvedValue(mockWorkouts as any)

      const result = await tools.analyze_training_load.execute(
        { start_date: '2023-01-01' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getForUser).toHaveBeenCalled()
      expect(result).toEqual({
        period: { start: '2023-01-01', end: 'now' },
        total_workouts: 2,
        total_tss: 150,
        avg_tss: 75,
        metrics: expect.any(String)
      })
    })
  })

  describe('create_chart', () => {
    it('should pass through args with success flag', async () => {
      const args = {
        type: 'line',
        title: 'TSS Chart',
        labels: ['M', 'T'],
        datasets: [{ label: 'TSS', data: [50, 100] }]
      }

      const result = await tools.create_chart.execute(args as any, {
        toolCallId: '1',
        messages: []
      })

      expect(result).toEqual({ success: true, ...args })
    })
  })
})
