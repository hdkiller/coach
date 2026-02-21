import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analysisTools } from '../../../../../server/utils/ai-tools/analysis'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { prisma } from '../../../../../server/utils/db'
import {
  getInitialPMCValues,
  calculateProjectedPMC
} from '../../../../../server/utils/training-stress'

// Mock the repository
vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    report: {
      create: vi.fn()
    },
    plannedWorkout: {
      findMany: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    workout: {
      findFirst: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/training-stress', () => ({
  getInitialPMCValues: vi.fn(),
  calculateProjectedPMC: vi.fn()
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

  describe('forecast_training_load', () => {
    it('should forecast from provided planned workouts and include metric forecasts', async () => {
      vi.mocked(getInitialPMCValues).mockResolvedValue({ ctl: 35, atl: 40 })
      vi.mocked(calculateProjectedPMC).mockReturnValue([
        { date: new Date('2026-02-20T00:00:00Z'), ctl: 35.8, atl: 41.3, tsb: -5.5, tss: 70 },
        { date: new Date('2026-02-21T00:00:00Z'), ctl: 36.2, atl: 42.5, tsb: -6.3, tss: 80 }
      ] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ftp: 230 } as any)
      vi.mocked(prisma.workout.findFirst).mockResolvedValue({ maxWatts: 820 } as any)

      const result = await tools.forecast_training_load.execute(
        {
          start_date: '2026-02-20',
          end_date: '2026-02-21',
          focus_metric: 'CTL',
          planned_workouts: [{ date: '2026-02-20', tss: 75, duration_minutes: 75, type: 'Tempo' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(getInitialPMCValues).toHaveBeenCalledWith(userId, new Date('2026-02-20T00:00:00Z'))
      expect(calculateProjectedPMC).toHaveBeenCalled()
      expect(result).toMatchObject({
        predictions: [
          { date: '2026-02-20', ctl: 35.8, atl: 41.3, tsb: -5.5 },
          { date: '2026-02-21', ctl: 36.2, atl: 42.5, tsb: -6.3 }
        ],
        summary: expect.any(String),
        ftp_forecast: {
          date: '2026-02-21',
          confidence: expect.any(Number)
        },
        peak_power_forecast: {
          date: '2026-02-21',
          confidence: expect.any(Number)
        },
        focus_metric: 'CTL'
      })
    })

    it('should reject invalid date ranges', async () => {
      const result = await tools.forecast_training_load.execute(
        {
          start_date: '2026-02-21',
          end_date: '2026-02-20'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'start_date must be on or before end_date' })
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
