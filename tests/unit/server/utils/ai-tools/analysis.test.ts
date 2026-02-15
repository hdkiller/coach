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
  const mockSettings = {
    aiPersona: 'Supportive',
    aiModelPreference: 'flash',
    aiAutoAnalyzeWorkouts: false,
    aiAutoAnalyzeNutrition: false,
    nutritionTrackingEnabled: true
  }
  const tools = analysisTools(userId, timezone, mockSettings)

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

  describe('generate_report', () => {
    it('should only include nutrition reports when enabled', () => {
      const settingsWithNutrition = { ...mockSettings, nutritionTrackingEnabled: true }
      const toolsWithNutrition = analysisTools(userId, timezone, settingsWithNutrition)
      const schemaWithNutrition = (toolsWithNutrition.generate_report.inputSchema as any).shape.type
      expect(() => schemaWithNutrition.parse('WEEKLY_NUTRITION')).not.toThrow()
      expect(() => schemaWithNutrition.parse('LAST_3_NUTRITION')).not.toThrow()

      const settingsWithoutNutrition = { ...mockSettings, nutritionTrackingEnabled: false }
      const toolsWithoutNutrition = analysisTools(userId, timezone, settingsWithoutNutrition)
      const schemaWithoutNutrition = (toolsWithoutNutrition.generate_report.inputSchema as any)
        .shape.type
      expect(() => schemaWithoutNutrition.parse('WEEKLY_NUTRITION')).toThrow()
      expect(() => schemaWithoutNutrition.parse('LAST_3_NUTRITION')).toThrow()
    })
  })

  describe('create_chart', () => {
    it('should accept all supported chart types', () => {
      const schema = tools.create_chart.inputSchema as any
      const supported = [
        'line',
        'area',
        'bar',
        'stackedBar',
        'doughnut',
        'radar',
        'scatter',
        'bubble',
        'mixed'
      ]

      for (const type of supported) {
        const payload =
          type === 'scatter' || type === 'bubble'
            ? {
                type,
                title: 'Scatter',
                datasets: [{ label: 'Series', data: [{ x: 100, y: 160, r: 8 }] }]
              }
            : type === 'mixed'
              ? {
                  type,
                  title: 'Mixed',
                  labels: ['A', 'B'],
                  datasets: [
                    { label: 'Volume', type: 'bar', data: [1, 2] },
                    { label: 'Trend', type: 'line', data: [1, 2] }
                  ]
                }
              : {
                  type,
                  title: 'Chart',
                  labels: ['A', 'B'],
                  datasets: [{ label: 'Series', data: [1, 2] }]
                }

        expect(() => schema.parse(payload)).not.toThrow()
      }
    })

    it('should reject label/data length mismatch for non-scatter charts', () => {
      const schema = tools.create_chart.inputSchema as any
      expect(() =>
        schema.parse({
          type: 'line',
          title: 'Invalid',
          labels: ['A', 'B'],
          datasets: [{ label: 'Series', data: [1] }]
        })
      ).toThrow()
    })

    it('should reject numeric scatter data points', () => {
      const schema = tools.create_chart.inputSchema as any
      expect(() =>
        schema.parse({
          type: 'scatter',
          title: 'Invalid Scatter',
          datasets: [{ label: 'Series', data: [1, 2, 3] }]
        })
      ).toThrow()
    })

    it('should reject numeric bubble data points', () => {
      const schema = tools.create_chart.inputSchema as any
      expect(() =>
        schema.parse({
          type: 'bubble',
          title: 'Invalid Bubble',
          datasets: [{ label: 'Series', data: [1, 2, 3] }]
        })
      ).toThrow()
    })

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
