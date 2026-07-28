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
      findFirst: vi.fn(),
      findMany: vi.fn()
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

    it('should use the athlete local-day boundaries (not raw UTC) when timezone is behind UTC', async () => {
      // America/Los_Angeles is UTC-7 in late July (PDT). A workout at
      // 2025-07-30T02:00:00Z is 2025-07-29T19:00 local (still "the 29th" in
      // LA), so the query window for start/end_date=2025-07-29 must extend
      // into 2025-07-30 in UTC to capture it. Raw UTC boundaries would stop
      // at 2025-07-29T23:59:59.999Z and miss it.
      const laTools = analysisTools(userId, 'America/Los_Angeles', mockSettings)
      vi.mocked(workoutRepository.getForUser).mockResolvedValue([])

      await laTools.analyze_training_load.execute(
        { start_date: '2025-07-29', end_date: '2025-07-29' },
        { toolCallId: '1', messages: [] }
      )

      expect(workoutRepository.getForUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          startDate: new Date('2025-07-29T07:00:00.000Z'),
          endDate: new Date('2025-07-30T06:59:59.999Z')
        })
      )
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
        { date: new Date('2026-03-20T00:00:00Z'), ctl: 35.8, atl: 41.3, tsb: -5.5, tss: 70 },
        { date: new Date('2026-03-21T00:00:00Z'), ctl: 36.2, atl: 42.5, tsb: -6.3, tss: 80 }
      ] as any)
      vi.mocked(prisma.workout.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ftp: 230 } as any)
      vi.mocked(prisma.workout.findFirst).mockResolvedValue({ maxWatts: 820 } as any)

      const result = await tools.forecast_training_load.execute(
        {
          start_date: '2026-03-20',
          end_date: '2026-03-21',
          focus_metric: 'CTL',
          planned_workouts: [{ date: '2026-03-20', tss: 75, duration_minutes: 75, type: 'Tempo' }]
        },
        { toolCallId: '1', messages: [] }
      )

      expect(getInitialPMCValues).toHaveBeenCalledWith(userId, new Date('2026-03-20T00:00:00Z'))
      expect(calculateProjectedPMC).toHaveBeenCalled()
      expect(result).toMatchObject({
        predictions: [
          { date: '2026-03-20', ctl: 35.8, atl: 41.3, tsb: -5.5 },
          { date: '2026-03-21', ctl: 36.2, atl: 42.5, tsb: -6.3 }
        ],
        summary: expect.any(String),
        ftp_forecast: {
          date: '2026-03-21',
          confidence: expect.any(Number)
        },
        peak_power_forecast: {
          date: '2026-03-21',
          confidence: expect.any(Number)
        },
        focus_metric: 'CTL'
      })
    })

    it('should include completed workouts before future planned projection windows', async () => {
      vi.mocked(getInitialPMCValues).mockResolvedValue({ ctl: 0, atl: 0 })
      vi.mocked(prisma.workout.findMany).mockResolvedValue([
        { date: new Date('2026-03-01T00:00:00Z'), tss: 80, durationSec: 3600, type: 'Run' }
      ] as any)
      vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([
        { date: new Date('2026-03-03T00:00:00Z'), tss: 50, durationSec: 3600, type: 'Run' }
      ] as any)
      vi.mocked(calculateProjectedPMC).mockReturnValue([
        { date: new Date('2026-03-01T00:00:00Z'), ctl: 1, atl: 2, tsb: -1, tss: 80 },
        { date: new Date('2026-03-02T00:00:00Z'), ctl: 1, atl: 1.5, tsb: -0.5, tss: 0 },
        { date: new Date('2026-03-03T00:00:00Z'), ctl: 2, atl: 3, tsb: -1, tss: 50 }
      ] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ftp: 230 } as any)
      vi.mocked(prisma.workout.findFirst).mockResolvedValue({ maxWatts: 820 } as any)

      await tools.forecast_training_load.execute(
        {
          start_date: '2026-03-01',
          end_date: '2026-03-03'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.workout.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isDuplicate: false,
          date: {
            gte: new Date('2026-03-01T00:00:00Z'),
            lte: new Date('2026-03-03T23:59:59.999Z')
          }
        },
        select: {
          date: true,
          tss: true,
          durationSec: true,
          type: true
        },
        orderBy: { date: 'asc' }
      })
      expect(calculateProjectedPMC).toHaveBeenCalledWith(
        new Date('2026-03-01T00:00:00Z'),
        new Date('2026-03-03T00:00:00Z'),
        0,
        0,
        [
          { date: new Date('2026-03-01T00:00:00Z'), tss: 80 },
          { date: new Date('2026-03-03T00:00:00Z'), tss: 50 }
        ]
      )
    })

    it('should use athlete local-day boundaries (not raw UTC) for the historical workout query', async () => {
      // America/Los_Angeles is UTC-8 (PST) in early March 2026. Fixing this
      // bug means the historical Workout query boundaries must reflect the
      // LA calendar day rather than raw UTC midnight of the date strings.
      vi.mocked(getInitialPMCValues).mockResolvedValue({ ctl: 10, atl: 12 })
      vi.mocked(prisma.workout.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([] as any)
      vi.mocked(calculateProjectedPMC).mockReturnValue([
        { date: new Date('2026-03-01T00:00:00Z'), ctl: 10, atl: 12, tsb: -2, tss: 0 },
        { date: new Date('2026-03-03T00:00:00Z'), ctl: 10, atl: 12, tsb: -2, tss: 0 }
      ] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ftp: null } as any)
      vi.mocked(prisma.workout.findFirst).mockResolvedValue(null as any)

      const laTools = analysisTools(userId, 'America/Los_Angeles', mockSettings)

      await laTools.forecast_training_load.execute(
        {
          start_date: '2026-03-01',
          end_date: '2026-03-03'
        },
        { toolCallId: '1', messages: [] }
      )

      expect(prisma.workout.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isDuplicate: false,
          date: {
            gte: new Date('2026-03-01T08:00:00.000Z'),
            lte: new Date('2026-03-04T07:59:59.999Z')
          }
        },
        select: {
          date: true,
          tss: true,
          durationSec: true,
          type: true
        },
        orderBy: { date: 'asc' }
      })
    })

    it('should include a same-day workout logged after local midnight in the historical query window', async () => {
      // Regression test for the day-boundary bug: historicalQueryEnd was
      // computed with getStartOfLocalDateUTC instead of getEndOfLocalDateUTC,
      // so a workout completed later in the local day (after local midnight,
      // i.e. later than the raw UTC start-of-day anchor) was excluded from
      // the `lte` bound and silently dropped from the forecast's historical
      // training-load calculation.
      //
      // America/Los_Angeles is UTC-8 (PST) in early March 2026. An athlete
      // completes a workout at 09:00 local on 2026-03-03 (17:00 UTC) and
      // requests a same-day forecast. The historical query's `lte` bound
      // must extend through end-of-day local time (2026-03-04T07:59:59.999Z)
      // so the workout is included, not truncated at start-of-day
      // (2026-03-03T08:00:00.000Z).
      const workoutAfterLocalMidnight = {
        date: new Date('2026-03-03T17:00:00.000Z'),
        tss: 65,
        durationSec: 3600,
        type: 'Ride'
      }

      vi.mocked(getInitialPMCValues).mockResolvedValue({ ctl: 10, atl: 12 })
      vi.mocked(prisma.workout.findMany).mockResolvedValue([workoutAfterLocalMidnight] as any)
      vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([] as any)
      vi.mocked(calculateProjectedPMC).mockReturnValue([
        { date: new Date('2026-03-01T00:00:00Z'), ctl: 10, atl: 12, tsb: -2, tss: 0 },
        { date: new Date('2026-03-03T00:00:00Z'), ctl: 10, atl: 12, tsb: -2, tss: 65 }
      ] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ftp: null } as any)
      vi.mocked(prisma.workout.findFirst).mockResolvedValue(null as any)

      const laTools = analysisTools(userId, 'America/Los_Angeles', mockSettings)

      await laTools.forecast_training_load.execute(
        {
          start_date: '2026-03-01',
          end_date: '2026-03-03'
        },
        { toolCallId: '1', messages: [] }
      )

      // The query window must reach end-of-local-day so the 17:00Z workout
      // (09:00 local) falls within the `lte` bound.
      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-03-01T08:00:00.000Z'),
              lte: new Date('2026-03-04T07:59:59.999Z')
            }
          })
        })
      )
      expect(workoutAfterLocalMidnight.date.getTime()).toBeLessThanOrEqual(
        new Date('2026-03-04T07:59:59.999Z').getTime()
      )

      expect(calculateProjectedPMC).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        10,
        12,
        expect.arrayContaining([
          expect.objectContaining({ date: workoutAfterLocalMidnight.date, tss: 65 })
        ])
      )
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
