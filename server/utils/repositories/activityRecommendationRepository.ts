import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const activityRecommendationRepository = {
  async findToday(userId: string, date: Date) {
    return prisma.activityRecommendation.findFirst({
      where: {
        userId,
        date
      },
      include: {
        plannedWorkout: true
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  async findById(id: string, userId: string) {
    return prisma.activityRecommendation.findUnique({
      where: { id, userId },
      include: {
        plannedWorkout: true
      }
    })
  },

  async create(data: Prisma.ActivityRecommendationCreateInput) {
    return prisma.activityRecommendation.create({
      data
    })
  },

  async createProcessingPlaceholder(userId: string, date: Date) {
    return prisma.activityRecommendation.create({
      data: {
        user: { connect: { id: userId } },
        date,
        recommendation: 'proceed',
        confidence: 0,
        reasoning: 'Analysis in progress...',
        status: 'PROCESSING'
      }
    })
  },

  async update(id: string, userId: string, data: Prisma.ActivityRecommendationUpdateInput) {
    return prisma.activityRecommendation.update({
      where: { id, userId },
      data
    })
  },

  async upsert(
    userId: string,
    date: Date,
    data: Omit<Prisma.ActivityRecommendationCreateInput, 'user' | 'date'>
  ) {
    // Note: ActivityRecommendation doesn't have a unique constraint on [userId, date] in the schema?
    // Let's check schema.prisma
    // @@index([userId, date]) is there, but not @@unique([userId, date])
    // So we use findFirst + update or create.
    const existing = await this.findToday(userId, date)
    if (existing) {
      return this.update(existing.id, userId, data)
    }
    return this.create({
      ...data,
      user: { connect: { id: userId } },
      date
    })
  }
}
