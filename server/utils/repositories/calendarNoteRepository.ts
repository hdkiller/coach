import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const calendarNoteRepository = {
  async upsert(
    userId: string,
    source: string,
    externalId: string,
    data: Prisma.CalendarNoteUncheckedCreateInput
  ) {
    return prisma.calendarNote.upsert({
      where: {
        userId_source_externalId: {
          userId,
          source,
          externalId
        }
      },
      create: data,
      update: data as Prisma.CalendarNoteUncheckedUpdateInput
    })
  },

  async getForUser(
    userId: string,
    options: {
      startDate?: Date
      endDate?: Date
      orderBy?: Prisma.CalendarNoteOrderByWithRelationInput
    } = {}
  ) {
    const where: Prisma.CalendarNoteWhereInput = {
      userId
    }

    if (options.startDate && options.endDate) {
      // Overlap query for ranged notes:
      // note.start <= rangeEnd AND (note.end IS NULL OR note.end >= rangeStart)
      where.AND = [
        { startDate: { lte: options.endDate } },
        {
          OR: [{ endDate: null }, { endDate: { gte: options.startDate } }]
        }
      ]
    } else if (options.startDate) {
      where.OR = [{ endDate: null }, { endDate: { gte: options.startDate } }]
    } else if (options.endDate) {
      where.startDate = { lte: options.endDate }
    }

    return prisma.calendarNote.findMany({
      where,
      orderBy: options.orderBy || { startDate: 'asc' }
    })
  },

  async findById(id: string, userId: string) {
    return prisma.calendarNote.findFirst({
      where: {
        id,
        userId
      }
    })
  },

  async deleteExternal(userId: string, source: string, externalIds: string[]) {
    return prisma.calendarNote.deleteMany({
      where: {
        userId,
        source,
        externalId: { in: externalIds }
      }
    })
  }
}
