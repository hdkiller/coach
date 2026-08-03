import { beforeEach, describe, expect, it, vi } from 'vitest'

const { integrationFindUnique, runIngestGarmin } = vi.hoisted(() => ({
  integrationFindUnique: vi.fn(),
  runIngestGarmin: vi.fn()
}))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    integration: {
      findUnique: integrationFindUnique
    }
  }
}))

vi.mock('../../../server/utils/services/garminService', () => ({
  GarminService: {
    runIngestGarmin
  }
}))

vi.mock('../../../trigger/queues', () => ({
  userIngestionQueue: { name: 'user-ingestion' }
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  task: vi.fn().mockImplementation((config: any) => ({
    run: config.run,
    id: config.id
  })),
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const FIFTEEN_MIN_MS = 15 * 60 * 1000
const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60

describe('ingestGarminTask (CW-90 recovery-only guards)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('skips the pull without calling GarminService when a sync completed inside the cooldown window', async () => {
    const recentSync = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    integrationFindUnique.mockResolvedValue({ lastSyncAt: recentSync })

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    const result = await ingestGarminTask.run({ userId: 'user-1' })

    expect(runIngestGarmin).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: true, skipped: true, reason: 'cooldown' })
  })

  it('proceeds when the last sync is older than the cooldown window', async () => {
    const oldSync = new Date(Date.now() - (FIFTEEN_MIN_MS + 60 * 1000)) // just over 15 minutes ago
    integrationFindUnique.mockResolvedValue({ lastSyncAt: oldSync })
    runIngestGarmin.mockResolvedValue({ success: true, counts: {} })

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    await ingestGarminTask.run({ userId: 'user-1' })

    expect(runIngestGarmin).toHaveBeenCalledTimes(1)
  })

  it('proceeds when there is no prior successful sync', async () => {
    integrationFindUnique.mockResolvedValue(null)
    runIngestGarmin.mockResolvedValue({ success: true, counts: {} })

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    await ingestGarminTask.run({ userId: 'user-1' })

    expect(runIngestGarmin).toHaveBeenCalledTimes(1)
  })

  it('clamps a startDate further back than the max lookback window', async () => {
    integrationFindUnique.mockResolvedValue(null)
    runIngestGarmin.mockResolvedValue({ success: true, counts: {} })

    const farPastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    await ingestGarminTask.run({ userId: 'user-1', startDate: farPastDate })

    expect(runIngestGarmin).toHaveBeenCalledTimes(1)
    const callArg = runIngestGarmin.mock.calls[0][0]
    const clampedSeconds = Math.floor(new Date(callArg.startDate).getTime() / 1000)
    const nowSeconds = Math.floor(Date.now() / 1000)

    // Clamped start should sit at (now - 3 days), not the far-past requested date.
    expect(nowSeconds - clampedSeconds).toBeLessThanOrEqual(THREE_DAYS_SECONDS + 5)
    expect(nowSeconds - clampedSeconds).toBeGreaterThan(THREE_DAYS_SECONDS - 5)
  })

  it('clamps a startTimestamp further back than the max lookback window', async () => {
    integrationFindUnique.mockResolvedValue(null)
    runIngestGarmin.mockResolvedValue({ success: true, counts: {} })

    const nowSeconds = Math.floor(Date.now() / 1000)
    const farPastTimestamp = nowSeconds - 30 * 24 * 60 * 60 // 30 days ago

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    await ingestGarminTask.run({ userId: 'user-1', startTimestamp: farPastTimestamp })

    expect(runIngestGarmin).toHaveBeenCalledTimes(1)
    const callArg = runIngestGarmin.mock.calls[0][0]

    expect(nowSeconds - callArg.startTimestamp).toBeLessThanOrEqual(THREE_DAYS_SECONDS + 5)
    expect(nowSeconds - callArg.startTimestamp).toBeGreaterThan(THREE_DAYS_SECONDS - 5)
  })

  it('leaves a recent startDate within the lookback window untouched', async () => {
    integrationFindUnique.mockResolvedValue(null)
    runIngestGarmin.mockResolvedValue({ success: true, counts: {} })

    const recentStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago

    const { ingestGarminTask } = await import('../../../trigger/ingest-garmin')
    await ingestGarminTask.run({ userId: 'user-1', startDate: recentStart })

    const callArg = runIngestGarmin.mock.calls[0][0]
    expect(callArg.startDate).toBe(recentStart)
  })
})
