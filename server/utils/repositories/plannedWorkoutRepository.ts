import { prisma } from '../db'
import type { Prisma } from '@prisma/client'
import { publishActivityEvent } from '../activity-realtime'

export const plannedWorkoutRepository = {
  /**
   * Get a single planned workout by ID, ensuring it belongs to the user
   */
  async getById(
    id: string,
    userId: string,
    options: {
      include?: Prisma.PlannedWorkoutInclude
      select?: Prisma.PlannedWorkoutSelect
    } = {}
  ) {
    if (options.select) {
      return prisma.plannedWorkout.findFirst({
        where: { id, userId },
        select: options.select
      })
    }
    return prisma.plannedWorkout.findFirst({
      where: { id, userId },
      include: options.include
    })
  },

  /**
   * Create a new planned workout
   */
  async create(data: Prisma.PlannedWorkoutUncheckedCreateInput) {
    const created = await prisma.plannedWorkout.create({
      data
    })

    await publishActivityEvent(created.userId, {
      scope: 'calendar',
      entityType: 'planned_workout',
      entityId: created.id,
      reason: 'created'
    })

    return created
  },

  /**
   * Update a planned workout
   * Enforces userId check if provided
   */
  async update(id: string, userId: string, data: Prisma.PlannedWorkoutUpdateInput) {
    const updated = await prisma.plannedWorkout.update({
      where: { id, userId },
      data
    })

    await publishActivityEvent(userId, {
      scope: 'calendar',
      entityType: 'planned_workout',
      entityId: updated.id,
      reason: 'updated'
    })

    return updated
  },

  /**
   * Delete a planned workout
   */
  async delete(id: string, userId: string) {
    const deleted = await prisma.plannedWorkout.delete({
      where: { id, userId }
    })

    await publishActivityEvent(userId, {
      scope: 'calendar',
      entityType: 'planned_workout',
      entityId: deleted.id,
      reason: 'deleted'
    })

    return deleted
  },

  /**
   * List planned workouts with filters
   */
  async list(
    userId: string,
    options: {
      startDate?: Date
      endDate?: Date
      limit?: number
      independentOnly?: boolean
      orderBy?:
        | Prisma.PlannedWorkoutOrderByWithRelationInput
        | Prisma.PlannedWorkoutOrderByWithRelationInput[]
      include?: Prisma.PlannedWorkoutInclude
      where?: Prisma.PlannedWorkoutWhereInput
    } = {}
  ) {
    const where: Prisma.PlannedWorkoutWhereInput = {
      userId,
      date: {
        gte: options.startDate
      },
      ...options.where
    }

    if (options.endDate) {
      if (where.date && typeof where.date === 'object') {
        ;(where.date as any).lte = options.endDate
      } else {
        where.date = { lte: options.endDate }
      }
    }

    if (options.independentOnly) {
      where.trainingWeekId = null
    }

    return prisma.plannedWorkout.findMany({
      where,
      orderBy: options.orderBy || [{ date: 'asc' }, { startTime: 'asc' }],
      take: options.limit,
      include: options.include
    })
  }
}
