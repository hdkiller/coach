import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { sportSettingsRepository } from '../../../../../server/utils/repositories/sportSettingsRepository'
import { findPeakEfforts } from '../../../../../server/utils/interval-detection'
import { createUserNotification } from '../../../../../server/utils/notifications'
import { queueThresholdUpdateEmail } from '../../../../../server/utils/workout-insight-email'
import { thresholdDetectionService } from '../../../../../server/utils/services/thresholdDetectionService'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    metricHistory: {
      create: vi.fn(),
      createMany: vi.fn()
    },
    recommendation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/interval-detection', () => ({
  findPeakEfforts: vi.fn()
}))

vi.mock('../../../../../server/utils/notifications', () => ({
  createUserNotification: vi.fn()
}))

vi.mock('../../../../../server/utils/workout-insight-email', () => ({
  queueThresholdUpdateEmail: vi.fn()
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn()
  }
}))

describe('thresholdDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.recommendation.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.recommendation.create).mockResolvedValue({ id: 'rec-1' } as any)
    vi.mocked(prisma.metricHistory.create).mockResolvedValue({ id: 'mh-1' } as any)
    vi.mocked(prisma.metricHistory.createMany).mockResolvedValue({ count: 0 } as any)
  })

  it('logs FTP history on the triggering workout date and stores the sport profile', async () => {
    const workoutDate = new Date('2025-02-05T10:00:00Z')

    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      name: 'Cycling',
      ftp: 250
    } as any)
    vi.mocked(findPeakEfforts).mockReturnValue([{ duration: 1200, value: 280 } as any])

    await thresholdDetectionService.detectThresholdIncreases({
      id: 'workout-1',
      userId: 'user-1',
      type: 'Ride',
      title: 'Threshold Builder',
      durationSec: 3600,
      date: workoutDate,
      streams: {
        watts: [200, 260, 300],
        time: [0, 600, 1200]
      },
      user: {
        ftp: 250
      }
    })

    expect(prisma.metricHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'FTP',
        value: 266,
        oldValue: 250,
        date: workoutDate,
        sportProfileName: 'Cycling'
      })
    })
    expect(createUserNotification).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        title: 'New Cycling FTP Detected',
        message: expect.stringContaining('Cycling profile FTP increased')
      })
    )
    expect(queueThresholdUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'FTP',
        sportProfileName: 'Cycling'
      })
    )
  })

  it('logs running threshold pace history on the workout date', async () => {
    const workoutDate = new Date('2025-01-10T07:30:00Z')

    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      name: 'Running',
      thresholdPace: 260
    } as any)
    vi.mocked(findPeakEfforts).mockReturnValue([{ duration: 2400, value: 4 } as any])

    await thresholdDetectionService.detectThresholdIncreases({
      id: 'workout-2',
      userId: 'user-1',
      type: 'Run',
      title: 'Tempo Run',
      durationSec: 3600,
      date: workoutDate,
      streams: {
        velocity: [3.8, 4, 4.1],
        time: [0, 1200, 2400]
      },
      user: {}
    })

    expect(prisma.metricHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'THRESHOLD_PACE',
        date: workoutDate,
        sportProfileName: 'Running'
      })
    })
  })
})
