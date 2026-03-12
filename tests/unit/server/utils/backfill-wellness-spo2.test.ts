import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backfillWellnessSpO2 } from '../../../../server/utils/backfill-wellness-spo2'

describe('backfillWellnessSpO2', () => {
  const findMany = vi.fn()
  const update = vi.fn()

  const prisma = {
    wellness: {
      findMany,
      update
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports matching records in dry-run mode without writing updates', async () => {
    findMany
      .mockResolvedValueOnce([
        {
          id: 'w1',
          userId: 'u1',
          date: new Date('2026-03-10T00:00:00Z'),
          spO2: 1,
          history: [],
          lastSource: 'apple_health'
        },
        {
          id: 'w2',
          userId: 'u2',
          date: new Date('2026-03-11T00:00:00Z'),
          spO2: 0.976,
          history: null,
          lastSource: null
        }
      ])
      .mockResolvedValueOnce([])

    const log = vi.fn()
    const result = await backfillWellnessSpO2(prisma as any, { dryRun: true, limit: 100, log })

    expect(result).toMatchObject({
      scanned: 2,
      matched: 2,
      updated: 2,
      skipped: 0,
      batches: 1
    })
    expect(result.samples).toEqual([
      expect.objectContaining({ id: 'w1', oldSpO2: 1, newSpO2: 100 }),
      expect.objectContaining({ id: 'w2', oldSpO2: 0.976, newSpO2: 97.6 })
    ])
    expect(update).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(2)
  })

  it('updates matching records and appends history in live mode', async () => {
    findMany
      .mockResolvedValueOnce([
        {
          id: 'w1',
          userId: 'u1',
          date: new Date('2026-03-10T00:00:00Z'),
          spO2: 1,
          history: [{ source: 'apple_health', changes: 'created' }],
          lastSource: 'apple_health'
        }
      ])
      .mockResolvedValueOnce([])

    const result = await backfillWellnessSpO2(prisma as any, { dryRun: false, limit: 100 })

    expect(result.updated).toBe(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: {
        spO2: 100,
        history: [
          { source: 'apple_health', changes: 'created' },
          expect.objectContaining({
            source: 'backfill:wellness-spo2',
            changedFields: ['spO2'],
            changes: {
              spO2: {
                old: 1,
                new: 100
              }
            }
          })
        ]
      }
    })
  })
})
