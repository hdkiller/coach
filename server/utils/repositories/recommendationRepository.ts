import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const recommendationRepository = {
  async list(
    userId: string,
    filters: {
      status?: string
      isPinned?: boolean
      metric?: string
      category?: string
      sourceType?: string
      limit?: number
    }
  ) {
    const where: Prisma.RecommendationWhereInput = { userId }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    if (filters.isPinned !== undefined) {
      where.isPinned = filters.isPinned
    }

    if (filters.metric) where.metric = filters.metric
    if (filters.category) where.category = filters.category
    if (filters.sourceType) where.sourceType = filters.sourceType

    return prisma.recommendation.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: filters.limit || 50
    })
  },

  async findById(id: string, userId: string) {
    return prisma.recommendation.findUnique({
      where: { id, userId }
    })
  },

  async getActive(userId: string) {
    return prisma.recommendation.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { generatedAt: 'desc' }
    })
  },

  async getCategories(userId: string) {
    const recs = await prisma.recommendation.findMany({
      where: { userId },
      select: { category: true }
    })
    return Array.from(new Set(recs.map((r) => r.category).filter(Boolean))) as string[]
  },

  async update(id: string, userId: string, data: Prisma.RecommendationUpdateInput) {
    return prisma.recommendation.update({
      where: { id, userId },
      data
    })
  },

  async updateMany(
    userId: string,
    ids: string[],
    data: Prisma.RecommendationUpdateManyMutationInput
  ) {
    return prisma.recommendation.updateMany({
      where: { id: { in: ids }, userId },
      data
    })
  },

  async createMany(data: Prisma.RecommendationCreateManyInput[]) {
    return prisma.recommendation.createMany({
      data
    })
  },

  async clearAll(userId: string) {
    return prisma.recommendation.deleteMany({
      where: { userId }
    })
  }
}
