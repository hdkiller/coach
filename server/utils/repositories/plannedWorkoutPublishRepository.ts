import { prisma } from '../db'

export const plannedWorkoutPublishRepository = {
  async getByProvider(plannedWorkoutId: string, provider: string) {
    return prisma.plannedWorkoutPublishTarget.findUnique({
      where: {
        plannedWorkoutId_provider: {
          plannedWorkoutId,
          provider
        }
      }
    })
  },

  async upsert(
    plannedWorkoutId: string,
    provider: string,
    data: {
      externalId?: string | null
      scheduleId?: string | null
      status?: string
      error?: string | null
      lastSyncedAt?: Date | null
    }
  ) {
    return prisma.plannedWorkoutPublishTarget.upsert({
      where: {
        plannedWorkoutId_provider: {
          plannedWorkoutId,
          provider
        }
      },
      create: {
        plannedWorkoutId,
        provider,
        externalId: data.externalId ?? null,
        scheduleId: data.scheduleId ?? null,
        status: data.status || 'PENDING',
        error: data.error ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null
      },
      update: {
        externalId: data.externalId,
        scheduleId: data.scheduleId,
        status: data.status,
        error: data.error,
        lastSyncedAt: data.lastSyncedAt
      }
    })
  }
}
