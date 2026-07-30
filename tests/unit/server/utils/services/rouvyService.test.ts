import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ingestRouvyFitFile,
  rouvyService,
  type IngestRouvyFitPayload
} from '../../../../../server/utils/services/rouvyService'
import { hasTaskHandler, getTaskHandler } from '../../../../../server/utils/task-registry'

const {
  prismaMock,
  workoutRepositoryMock,
  workoutStreamRepositoryMock,
  rouvyMock,
  fitMock,
  stressMock,
  pacingMock
} = vi.hoisted(() => ({
  prismaMock: {
    integration: {
      findUnique: vi.fn()
    },
    fitFile: {
      upsert: vi.fn()
    }
  },
  workoutRepositoryMock: {
    update: vi.fn()
  },
  workoutStreamRepositoryMock: {
    upsert: vi.fn()
  },
  rouvyMock: {
    fetchRouvyActivityFitFile: vi.fn()
  },
  fitMock: {
    parseFitFile: vi.fn(),
    normalizeFitSession: vi.fn(),
    extractFitStreams: vi.fn(),
    reconstructSessionFromRecords: vi.fn(),
    extractFitExtrasMeta: vi.fn()
  },
  stressMock: {
    calculateWorkoutStress: vi.fn()
  },
  pacingMock: {
    calculateLapSplits: vi.fn(),
    calculatePaceVariability: vi.fn(),
    calculateAveragePace: vi.fn(),
    analyzePacingStrategy: vi.fn(),
    detectSurges: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: workoutRepositoryMock
}))

vi.mock('../../../../../server/utils/repositories/workoutStreamRepository', () => ({
  workoutStreamRepository: workoutStreamRepositoryMock
}))

vi.mock('../../../../../server/utils/rouvy', () => rouvyMock)

vi.mock('../../../../../server/utils/fit', () => fitMock)

vi.mock('../../../../../server/utils/calculate-workout-stress', () => stressMock)

vi.mock('../../../../../server/utils/pacing', () => pacingMock)

describe('rouvyService', () => {
  const payload: IngestRouvyFitPayload = {
    userId: 'user_123',
    workoutId: 'workout_456',
    activityId: 'activity_789'
  }

  const mockIntegration = {
    id: 'integ_1',
    userId: 'user_123',
    provider: 'rouvy',
    accessToken: 'access_token_abc'
  }

  const mockFitBuffer = Buffer.from('mock_fit_binary_data')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers ingest-rouvy-fit task handler in task registry', () => {
    expect(hasTaskHandler('ingest-rouvy-fit')).toBe(true)
    expect(getTaskHandler('ingest-rouvy-fit')).toBe(ingestRouvyFitFile)
  })

  it('successfully ingests a Rouvy FIT file and calculates pacing and stress', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration)
    rouvyMock.fetchRouvyActivityFitFile.mockResolvedValue(mockFitBuffer)

    const mockSession = { sport: 'cycling', total_timer_time: 3600 }
    const mockRecords = Array.from({ length: 25 }, (_, i) => ({
      timestamp: new Date(1700000000000 + i * 1000),
      distance: i * 10,
      speed: 10 + (i % 5)
    }))

    fitMock.parseFitFile.mockResolvedValue({
      sessions: [mockSession],
      records: mockRecords
    })

    const mockNormalizedWorkout = {
      title: 'Rouvy Virtual Ride',
      durationSec: 3600,
      distanceMeters: 10000
    }
    fitMock.normalizeFitSession.mockReturnValue(mockNormalizedWorkout)

    const mockStreams = {
      time: [
        0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
        200, 210, 220, 230, 240
      ],
      distance: [
        0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
        950, 1000, 1050, 1100, 1150, 1200
      ],
      velocity: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
    }
    fitMock.extractFitStreams.mockReturnValue(mockStreams)
    fitMock.extractFitExtrasMeta.mockReturnValue({ device: 'Rouvy App' })

    pacingMock.calculateLapSplits.mockReturnValue([{ lap: 1, splitTimeSec: 200 }])
    pacingMock.calculatePaceVariability.mockReturnValue(0.05)
    pacingMock.calculateAveragePace.mockReturnValue(200)
    pacingMock.analyzePacingStrategy.mockReturnValue('even')
    pacingMock.detectSurges.mockReturnValue([])

    workoutRepositoryMock.update.mockResolvedValue({ id: payload.workoutId })
    workoutStreamRepositoryMock.upsert.mockResolvedValue({})
    prismaMock.fitFile.upsert.mockResolvedValue({})
    stressMock.calculateWorkoutStress.mockResolvedValue({})

    const result = await rouvyService.ingestRouvyFitFile(payload)

    expect(result).toEqual({
      success: true,
      workoutId: 'workout_456'
    })

    expect(prismaMock.integration.findUnique).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: 'user_123',
          provider: 'rouvy'
        }
      }
    })

    expect(rouvyMock.fetchRouvyActivityFitFile).toHaveBeenCalledWith(
      mockIntegration,
      'activity_789'
    )
    expect(fitMock.parseFitFile).toHaveBeenCalledWith(mockFitBuffer)
    expect(fitMock.normalizeFitSession).toHaveBeenCalledWith(
      mockSession,
      'user_123',
      'rouvy_activity_789.fit'
    )

    expect(workoutRepositoryMock.update).toHaveBeenCalledWith('workout_456', {
      ...mockNormalizedWorkout,
      source: 'rouvy'
    })

    expect(workoutStreamRepositoryMock.upsert).toHaveBeenCalledWith('workout_456', {
      ...mockStreams,
      extrasMeta: { device: 'Rouvy App' },
      lapSplits: [{ lap: 1, splitTimeSec: 200 }],
      paceVariability: 0.05,
      avgPacePerKm: 200,
      pacingStrategy: null,
      surges: []
    })

    expect(prismaMock.fitFile.upsert).toHaveBeenCalledWith({
      where: { workoutId: 'workout_456' },
      create: expect.objectContaining({
        userId: 'user_123',
        workoutId: 'workout_456',
        filename: 'rouvy_activity_789.fit',
        fileData: expect.any(Uint8Array)
      }),
      update: expect.objectContaining({
        fileData: expect.any(Uint8Array)
      })
    })

    expect(stressMock.calculateWorkoutStress).toHaveBeenCalledWith('workout_456', 'user_123')
  })

  it('reconstructs session from records if session is missing in fitData', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration)
    rouvyMock.fetchRouvyActivityFitFile.mockResolvedValue(mockFitBuffer)

    const mockRecords = [{ distance: 10 }]
    const reconstructedSession = { sport: 'cycling' }

    fitMock.parseFitFile.mockResolvedValue({
      sessions: [],
      records: mockRecords
    })
    fitMock.reconstructSessionFromRecords.mockReturnValue(reconstructedSession)
    fitMock.normalizeFitSession.mockReturnValue({ title: 'Reconstructed' })
    fitMock.extractFitStreams.mockReturnValue({})
    fitMock.extractFitExtrasMeta.mockReturnValue({})

    const result = await ingestRouvyFitFile(payload)

    expect(result).toEqual({ success: true, workoutId: 'workout_456' })
    expect(fitMock.reconstructSessionFromRecords).toHaveBeenCalledWith(mockRecords)
    expect(fitMock.normalizeFitSession).toHaveBeenCalledWith(
      reconstructedSession,
      'user_123',
      'rouvy_activity_789.fit'
    )
  })

  it('throws an error if ROUVY integration is not found', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(null)

    await expect(ingestRouvyFitFile(payload)).rejects.toThrow(
      'ROUVY integration not found for user'
    )
  })

  it('throws an error if fit file has no session and cannot be reconstructed', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration)
    rouvyMock.fetchRouvyActivityFitFile.mockResolvedValue(mockFitBuffer)

    fitMock.parseFitFile.mockResolvedValue({
      sessions: [],
      records: []
    })
    fitMock.reconstructSessionFromRecords.mockReturnValue(null)

    await expect(ingestRouvyFitFile(payload)).rejects.toThrow(
      'No session data found in FIT file and could not reconstruct from records'
    )
  })

  it('swallows error from calculateWorkoutStress without failing ingestion', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(mockIntegration)
    rouvyMock.fetchRouvyActivityFitFile.mockResolvedValue(mockFitBuffer)
    fitMock.parseFitFile.mockResolvedValue({
      sessions: [{ sport: 'cycling' }],
      records: []
    })
    fitMock.normalizeFitSession.mockReturnValue({ title: 'Test' })
    fitMock.extractFitStreams.mockReturnValue({})
    fitMock.extractFitExtrasMeta.mockReturnValue({})
    stressMock.calculateWorkoutStress.mockRejectedValue(new Error('Stress calculation failed'))

    const result = await ingestRouvyFitFile(payload)

    expect(result).toEqual({ success: true, workoutId: 'workout_456' })
    expect(stressMock.calculateWorkoutStress).toHaveBeenCalledWith('workout_456', 'user_123')
  })
})
