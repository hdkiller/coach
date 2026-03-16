import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const dailyCheckinRepository = {
  async getByDate(userId: string, date: Date) {
    return prisma.dailyCheckin.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    })
  },

  async findById(id: string) {
    return prisma.dailyCheckin.findUnique({
      where: { id }
    })
  },

  async getHistory(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyCheckin.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        questions: true,
        userNotes: true
      }
    })
  },

  async getHistoryDetailed(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyCheckin.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      orderBy: { date: 'desc' }
    })
  },

  async getRecent(userId: string, limit: number = 7) {
    return prisma.dailyCheckin.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        date: true,
        questions: true,
        userNotes: true
      }
    })
  },

  async create(data: Prisma.DailyCheckinCreateInput) {
    return prisma.dailyCheckin.create({
      data
    })
  },

  async update(id: string, data: Prisma.DailyCheckinUpdateInput) {
    return prisma.dailyCheckin.update({
      where: { id },
      data
    })
  },

  async delete(id: string) {
    return prisma.dailyCheckin.delete({
      where: { id }
    })
  },

  async syncFeedback(entityId: string, feedback: string | null, feedbackText: string | null) {
    return prisma.dailyCheckin.update({
      where: { id: entityId },
      data: { feedback, feedbackText }
    })
  }
}
