import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bodyMetricResolver } from '../../../../../server/utils/services/bodyMetricResolver'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    wellness: {
      findFirst: vi.fn()
    },
    bodyMeasurementEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

describe('bodyMetricResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers profile weight when lock is enabled', async () => {
    vi.mocked(prisma.wellness.findFirst).mockResolvedValue({
      weight: 82,
      date: new Date('2026-03-01T00:00:00Z'),
      lastSource: 'oura'
    } as any)
    vi.mocked((prisma as any).bodyMeasurementEntry.findFirst).mockResolvedValue({
      value: 82,
      source: 'oura',
      recordedAt: new Date('2026-03-01T00:00:00Z')
    })

    const result = await bodyMetricResolver.resolveEffectiveWeight('user-1', {
      weight: 84.5,
      weightSourceMode: 'PROFILE_LOCK',
      weightUnits: 'Kilograms'
    })

    expect(result.value).toBe(84.5)
    expect(result.source.source).toBe('profile_locked')
  })

  it('prefers latest wellness weight in auto mode', async () => {
    vi.mocked(prisma.wellness.findFirst).mockResolvedValue({
      weight: 82,
      date: new Date('2026-03-01T00:00:00Z'),
      lastSource: 'oura'
    } as any)
    vi.mocked((prisma as any).bodyMeasurementEntry.findFirst).mockResolvedValue({
      value: 82,
      source: 'oura',
      recordedAt: new Date('2026-03-01T00:00:00Z')
    })

    const result = await bodyMetricResolver.resolveEffectiveWeight('user-1', {
      weight: 84.5,
      weightSourceMode: 'AUTO',
      weightUnits: 'Kilograms'
    })

    expect(result.value).toBe(82)
    expect(result.source.source).toBe('oura')
  })

  it('falls back to profile weight when no wellness weight exists', async () => {
    vi.mocked(prisma.wellness.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).bodyMeasurementEntry.findMany).mockResolvedValue([])
    vi.mocked((prisma as any).bodyMeasurementEntry.findFirst).mockResolvedValue(null)

    const result = await bodyMetricResolver.resolveEffectiveWeight('user-1', {
      weight: 84.5,
      weightSourceMode: 'AUTO',
      weightUnits: 'Kilograms'
    })

    expect(result.value).toBe(84.5)
    expect(result.source.source).toBe('profile_manual')
  })

  it('prefers configured source over newer source', async () => {
    vi.mocked((prisma as any).bodyMeasurementEntry.findMany).mockResolvedValue([
      {
        id: 'latest-intervals',
        metricKey: 'weight',
        value: 83,
        source: 'intervals',
        recordedAt: new Date('2026-03-03T00:00:00Z')
      },
      {
        id: 'older-withings',
        metricKey: 'weight',
        value: 82,
        source: 'withings',
        recordedAt: new Date('2026-03-01T00:00:00Z')
      }
    ])
    vi.mocked((prisma as any).bodyMeasurementEntry.findFirst).mockResolvedValue({
      id: 'latest-intervals',
      metricKey: 'weight',
      value: 83,
      source: 'intervals',
      recordedAt: new Date('2026-03-03T00:00:00Z')
    })

    const result = await bodyMetricResolver.resolveEffectiveWeight('user-1', {
      weight: 84.5,
      weightSourceMode: 'AUTO',
      weightUnits: 'Kilograms',
      dashboardSettings: {
        bodyMetrics: {
          preferredSources: {
            weight: 'withings'
          }
        }
      }
    })

    expect(result.value).toBe(82)
    expect(result.source.source).toBe('withings')
    expect(result.preferredSource).toBe('withings')
  })
})
