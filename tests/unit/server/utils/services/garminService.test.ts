import { describe, expect, it, vi } from 'vitest'

import {
  extractGarminBodyBatteryScore,
  extractGarminReadinessScore,
  extractGarminSpO2Percentage,
  GarminService
} from '../../../../../server/utils/services/garminService'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    integration: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

describe('GarminService.extractPullToken', () => {
  it('prefers the webhook query token', () => {
    const token = GarminService.extractPullToken(
      { token: 'payload-token' },
      { query: { token: 'query-token' }, headers: { 'x-garmin-pull-token': 'header-token' } }
    )

    expect(token).toBe('query-token')
  })

  it('falls back to the payload token', () => {
    const token = GarminService.extractPullToken(
      { token: 'payload-token' },
      { query: {}, headers: {} }
    )

    expect(token).toBe('payload-token')
  })

  it('falls back to the header token and handles missing values', () => {
    expect(
      GarminService.extractPullToken({}, { query: {}, headers: { 'x-garmin-pull-token': 'abc' } })
    ).toBe('abc')

    expect(GarminService.extractPullToken({}, { query: {}, headers: {} })).toBeNull()
  })
})

describe('extractGarminPushList', () => {
  it('prefers Health API Push keys over legacy aliases', async () => {
    const { extractGarminPushList } =
      await import('../../../../../server/utils/services/garminService')

    expect(
      extractGarminPushList(
        {
          bodyComps: [{ userId: 'a', weightInGrams: 70000 }],
          bodyComposition: [{ userId: 'b' }]
        },
        'bodyComps',
        'bodyComposition'
      )
    ).toEqual([{ userId: 'a', weightInGrams: 70000 }])

    expect(
      extractGarminPushList(
        { bodyComposition: [{ userId: 'legacy' }] },
        'bodyComps',
        'bodyComposition'
      )
    ).toEqual([{ userId: 'legacy' }])

    expect(
      extractGarminPushList({ stressDetails: [{ userId: 's' }] }, 'stressDetails', 'stress')
    ).toEqual([{ userId: 's' }])

    expect(
      extractGarminPushList(
        { allDayRespiration: [{ userId: 'r' }] },
        'allDayRespiration',
        'respiration'
      )
    ).toEqual([{ userId: 'r' }])

    expect(extractGarminPushList({ pulseox: [{ userId: 'p' }] }, 'pulseox', 'pulseOx')).toEqual([
      { userId: 'p' }
    ])

    expect(extractGarminPushList({}, 'bodyComps', 'bodyComposition')).toEqual([])
  })
})

describe('GarminService.getActivityFileExternalIds', () => {
  it('matches activity file records back to garmin workout external ids', () => {
    expect(
      GarminService.getActivityFileExternalIds({
        activityId: 22047215050,
        summaryId: '22047215050-file'
      })
    ).toEqual(['22047215050', '22047215050-file'])
  })

  it('handles sparse records', () => {
    expect(GarminService.getActivityFileExternalIds({ summaryId: 'abc-file' })).toEqual([
      'abc-file',
      'abc'
    ])
    expect(GarminService.getActivityFileExternalIds({})).toEqual([])
  })
})

describe('GarminService.resolveWellnessDate', () => {
  it('prefers Garmin calendarDate for date-only wellness records', () => {
    const date = GarminService.resolveWellnessDate({
      calendarDate: '2026-03-10',
      startTimeInSeconds: 1773097200
    })

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })

  it('uses Garmin startTimeOffsetInSeconds to keep the user local day', () => {
    const date = GarminService.resolveWellnessDate(
      {
        startTimeInSeconds: Date.parse('2026-03-09T23:00:00.000Z') / 1000,
        startTimeOffsetInSeconds: 3600
      },
      {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      }
    )

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })

  it('falls back to UTC timestamp normalization when no offset is provided', () => {
    const date = GarminService.resolveWellnessDate(
      {
        startTimeInSeconds: Date.parse('2026-03-10T04:30:00.000Z') / 1000
      },
      {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      }
    )

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })
})

describe('extractGarminBodyBatteryScore', () => {
  it('prefers the most recent body battery value when available', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryMostRecentValue: 68,
        bodyBatteryHighestValue: 92
      })
    ).toBe(68)
  })

  it('falls back to the highest body battery value when that is all Garmin provides', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryHighestValue: 81
      })
    ).toBe(81)
  })

  it('clamps out-of-range values into the app recovery score range', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryCurrentValue: 123
      })
    ).toBe(100)
  })

  it('returns null when the Garmin daily record has no body battery fields', () => {
    expect(
      extractGarminBodyBatteryScore({
        averageStressLevel: 37
      })
    ).toBeNull()
  })

  it('falls back to Garmin readiness-style scores when body battery is not available', () => {
    expect(
      extractGarminBodyBatteryScore({
        trainingReadinessScore: 74
      })
    ).toBe(74)
  })
})

describe('extractGarminReadinessScore', () => {
  it('normalizes Garmin training readiness scores into the app readiness scale', () => {
    expect(
      extractGarminReadinessScore({
        trainingReadinessScore: 74
      })
    ).toBe(7)
  })

  it('supports nested Garmin score payloads', () => {
    expect(
      extractGarminReadinessScore({
        trainingReadiness: { value: 83 }
      })
    ).toBe(8)
  })

  it('returns null when Garmin does not include a readiness metric', () => {
    expect(
      extractGarminReadinessScore({
        bodyBatteryMostRecentValue: 68
      })
    ).toBeNull()
  })
})

describe('extractGarminSpO2Percentage', () => {
  it('reads direct Garmin daily SpO2 fields', () => {
    expect(
      extractGarminSpO2Percentage({
        averagePulseOx: 96.4
      })
    ).toBe(96.4)
  })

  it('derives SpO2 from Garmin sleep sample maps when no daily average is present', () => {
    expect(
      extractGarminSpO2Percentage({
        timeOffsetSleepSpo2: {
          60: 95,
          120: 97,
          180: 96
        }
      })
    ).toBe(96)
  })

  it('returns null when Garmin provides no usable SpO2 data', () => {
    expect(
      extractGarminSpO2Percentage({
        averageStressLevel: 18
      })
    ).toBeNull()
  })
})

describe('GarminService.runIngestGarmin', () => {
  it('triggers backfill when direct REST pulls fail with InvalidPullTokenException', async () => {
    prismaMock.integration.findUnique.mockResolvedValue({
      id: 'int-123',
      userId: 'user-123',
      provider: 'garmin',
      ingestWorkouts: true,
      settings: {}
    })
    prismaMock.integration.update.mockResolvedValue({})

    const startBackfillSpy = vi.spyOn(GarminService, 'startBackfill').mockResolvedValue(undefined)

    const fetchers = await import('../../../../../server/utils/garmin')
    vi.spyOn(fetchers, 'refreshGarminIntegrationPermissions').mockImplementation(
      async (int: any) => int
    )
    vi.spyOn(fetchers, 'fetchGarminDailies').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )
    vi.spyOn(fetchers, 'fetchGarminSleeps').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )
    vi.spyOn(fetchers, 'fetchGarminHRV').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )
    vi.spyOn(fetchers, 'fetchGarminBodyComps').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )
    vi.spyOn(fetchers, 'fetchGarminUserMetrics').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )
    vi.spyOn(fetchers, 'fetchGarminActivities').mockRejectedValue(
      new Error('Garmin API error (400): InvalidPullTokenException failure')
    )

    const result = await GarminService.runIngestGarmin({ userId: 'user-123' })

    expect(result.success).toBe(true)
    expect(result.backfillTriggered).toBe(true)
    expect(startBackfillSpy).toHaveBeenCalledWith('user-123')
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int-123' },
        data: expect.objectContaining({
          syncStatus: 'SUCCESS',
          errorMessage: expect.stringContaining('Direct pull restricted by Garmin Health API')
        })
      })
    )

    vi.restoreAllMocks()
  })
})

describe('GarminService activity push stream & file ingestion', () => {
  it('does not attempt direct REST file download during processActivities when pullToken is absent', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ dashboardSettings: {} })
    prismaMock.fitFile = { findUnique: vi.fn().mockResolvedValue(null) } as any

    const garminModule = await import('../../../../../server/utils/garmin')
    const fetchFileSpy = vi
      .spyOn(garminModule, 'fetchGarminActivityFile')
      .mockResolvedValue(Buffer.from('fake'))

    const workoutRepoModule =
      await import('../../../../../server/utils/repositories/workoutRepository')
    const upsertSpy = vi.spyOn(workoutRepoModule.workoutRepository, 'upsert').mockResolvedValue({
      record: { id: 'workout-100' } as any,
      created: true
    })

    const streamRepoModule =
      await import('../../../../../server/utils/repositories/workoutStreamRepository')
    vi.spyOn(streamRepoModule.workoutStreamRepository, 'existsByWorkoutId').mockResolvedValue(false)

    await GarminService.processActivities(
      'user-1',
      [{ summaryId: 'activity-100', startTimeInSeconds: 1700000000, activityType: 'RUNNING' }],
      { id: 'int-1' }
    )

    expect(fetchFileSpy).not.toHaveBeenCalled()
    expect(upsertSpy).toHaveBeenCalledWith(
      'user-1',
      'garmin',
      'activity-100',
      expect.objectContaining({ externalId: 'activity-100', source: 'garmin' }),
      expect.objectContaining({ externalId: 'activity-100', source: 'garmin' })
    )
    vi.restoreAllMocks()
  })

  it('downloads FIT file directly and creates workout when activityFiles push arrives out-of-order', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ dashboardSettings: {} })
    prismaMock.workout = {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ rawJson: null }),
      update: vi.fn().mockResolvedValue({})
    } as any
    prismaMock.fitFile = {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({})
    } as any

    const garminModule = await import('../../../../../server/utils/garmin')
    const fetchByCallbackSpy = vi
      .spyOn(garminModule, 'fetchGarminActivityFileByCallbackUrl')
      .mockResolvedValue(Buffer.from('fake-fit-bytes'))

    const workoutRepoModule =
      await import('../../../../../server/utils/repositories/workoutRepository')
    const upsertSpy = vi.spyOn(workoutRepoModule.workoutRepository, 'upsert').mockResolvedValue({
      record: { id: 'workout-early-1', externalId: '23703759997' } as any,
      created: true
    })

    const streamRepoModule =
      await import('../../../../../server/utils/repositories/workoutStreamRepository')
    vi.spyOn(streamRepoModule.workoutStreamRepository, 'upsert').mockResolvedValue({} as any)

    const fitModule = await import('../../../../../server/utils/fit')
    vi.spyOn(fitModule, 'parseFitFile').mockResolvedValue({
      sessions: [
        {
          start_time: new Date(),
          total_timer_time: 1800,
          sport: 'running'
        }
      ],
      records: []
    } as any)

    await GarminService.processActivityFiles(
      'user-1',
      [
        {
          activityId: 23703759997,
          callbackURL:
            'https://apis.garmin.com/wellness-api/rest/activityFile?id=23703759997&token=abc123token'
        }
      ],
      { id: 'int-1' }
    )

    expect(fetchByCallbackSpy).toHaveBeenCalledWith(
      { id: 'int-1' },
      'https://apis.garmin.com/wellness-api/rest/activityFile?id=23703759997&token=abc123token'
    )
    expect(upsertSpy).toHaveBeenCalledWith(
      'user-1',
      'garmin',
      '23703759997',
      expect.objectContaining({ externalId: '23703759997', source: 'garmin' }),
      expect.objectContaining({ externalId: '23703759997', source: 'garmin' })
    )

    vi.restoreAllMocks()
  })

  it('marks file ingestion expired and requests backfill when activityFiles download token is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    prismaMock.workout = {
      findFirst: vi.fn().mockResolvedValue({
        id: 'workout-expired-1',
        externalId: '23772550387',
        date: new Date('2026-07-01T10:00:00.000Z')
      }),
      findUnique: vi.fn().mockResolvedValue({
        rawJson: { activityName: 'Morning Run' }
      }),
      update: vi.fn().mockResolvedValue({})
    } as any
    prismaMock.fitFile = {
      findUnique: vi.fn().mockResolvedValue(null)
    } as any

    const streamRepoModule =
      await import('../../../../../server/utils/repositories/workoutStreamRepository')
    vi.spyOn(streamRepoModule.workoutStreamRepository, 'existsByWorkoutId').mockResolvedValue(false)

    const garminModule = await import('../../../../../server/utils/garmin')
    vi.spyOn(garminModule, 'fetchGarminActivityFileByCallbackUrl').mockRejectedValue(
      new garminModule.GarminDownloadTokenExpiredError(
        'Garmin File API error (400): Invalid download token',
        400
      )
    )
    const backfillSpy = vi
      .spyOn(garminModule, 'requestGarminBackfill')
      .mockResolvedValue({ success: true } as any)

    await expect(
      GarminService.processActivityFiles(
        'user-1',
        [
          {
            activityId: 23772550387,
            startTimeInSeconds: 1_720_000_000,
            callbackURL:
              'https://apis.garmin.com/wellness-api/rest/activityFile?id=23772550387&token=stale'
          }
        ],
        { id: 'int-1' }
      )
    ).resolves.toBeUndefined()

    expect(prismaMock.workout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'workout-expired-1' },
        data: expect.objectContaining({
          rawJson: expect.objectContaining({
            activityName: 'Morning Run',
            garminFileIngestion: expect.objectContaining({
              status: 'download_token_expired',
              retryable: true,
              externalId: '23772550387'
            })
          })
        })
      })
    )
    expect(backfillSpy).toHaveBeenCalledWith(
      { id: 'int-1' },
      'activities',
      1_720_000_000 - 3600,
      expect.any(Number)
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('download token expired'),
      expect.objectContaining({ workoutId: 'workout-expired-1' })
    )
    expect(errorSpy).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('handles expired download tokens during processActivities without failing the batch', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    prismaMock.user.findUnique.mockResolvedValue({ dashboardSettings: {} })
    prismaMock.fitFile = { findUnique: vi.fn().mockResolvedValue(null) } as any
    prismaMock.workout = {
      findUnique: vi.fn().mockResolvedValue({ rawJson: {} }),
      update: vi.fn().mockResolvedValue({})
    } as any

    const garminModule = await import('../../../../../server/utils/garmin')
    vi.spyOn(garminModule, 'fetchGarminActivityFile').mockRejectedValue(
      new Error('Garmin File API error (400): Invalid download token')
    )
    const backfillSpy = vi
      .spyOn(garminModule, 'requestGarminBackfill')
      .mockResolvedValue({ success: true } as any)

    const workoutRepoModule =
      await import('../../../../../server/utils/repositories/workoutRepository')
    vi.spyOn(workoutRepoModule.workoutRepository, 'upsert').mockResolvedValue({
      record: { id: 'workout-200', externalId: 'activity-200' } as any,
      created: true
    })

    const streamRepoModule =
      await import('../../../../../server/utils/repositories/workoutStreamRepository')
    vi.spyOn(streamRepoModule.workoutStreamRepository, 'existsByWorkoutId').mockResolvedValue(false)

    await expect(
      GarminService.processActivities(
        'user-1',
        [
          {
            summaryId: 'activity-200',
            startTimeInSeconds: 1_720_000_100,
            activityType: 'RUNNING'
          }
        ],
        { id: 'int-1' },
        'stale-pull-token'
      )
    ).resolves.toBeUndefined()

    expect(prismaMock.workout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'workout-200' },
        data: expect.objectContaining({
          rawJson: expect.objectContaining({
            garminFileIngestion: expect.objectContaining({
              status: 'download_token_expired',
              retryable: true,
              externalId: 'activity-200'
            })
          })
        })
      })
    )
    expect(backfillSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})
