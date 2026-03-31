import type { Prisma } from '@prisma/client'
import { prisma } from '../db'

export const bodyMeasurementRepository = {
  async listForUser(
    userId: string,
    options: {
      metricKey?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      skip?: number
      cursorRecordedAt?: Date
      cursorId?: string
      includeDeleted?: boolean
      orderBy?:
        | Prisma.BodyMeasurementEntryOrderByWithRelationInput
        | Prisma.BodyMeasurementEntryOrderByWithRelationInput[]
    } = {}
  ) {
    return prisma.bodyMeasurementEntry.findMany({
      where: {
        userId,
        metricKey: options.metricKey,
        isDeleted: options.includeDeleted ? undefined : false,
        ...(options.cursorRecordedAt
          ? {
              OR: options.cursorId
                ? [
                    {
                      recordedAt: {
                        lt: options.cursorRecordedAt
                      }
                    },
                    {
                      recordedAt: options.cursorRecordedAt,
                      id: {
                        lt: options.cursorId
                      }
                    }
                  ]
                : [
                    {
                      recordedAt: {
                        lt: options.cursorRecordedAt
                      }
                    }
                  ]
            }
          : {}),
        recordedAt: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      take: options.limit,
      skip: options.skip,
      orderBy: options.orderBy || [{ recordedAt: 'desc' }, { id: 'desc' }]
    })
  },

  async getLatestForMetric(userId: string, metricKey: string) {
    return prisma.bodyMeasurementEntry.findFirst({
      where: {
        userId,
        metricKey,
        isDeleted: false
      },
      orderBy: { recordedAt: 'desc' }
    })
  },

  async getLatestByMetricKeys(userId: string, metricKeys: string[]) {
    const entries = await prisma.bodyMeasurementEntry.findMany({
      where: {
        userId,
        metricKey: { in: metricKeys },
        isDeleted: false
      },
      orderBy: [{ metricKey: 'asc' }, { recordedAt: 'desc' }]
    })

    const latest = new Map<string, (typeof entries)[number]>()
    for (const entry of entries) {
      if (!latest.has(entry.metricKey)) {
        latest.set(entry.metricKey, entry)
      }
    }

    return latest
  },

  async getByIdForUser(id: string, userId: string) {
    return prisma.bodyMeasurementEntry.findFirst({
      where: {
        id,
        userId
      }
    })
  }
}
