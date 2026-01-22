import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workout: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn()
    }
  }
}))

describe('workoutRepository', () => {
  const userId = 'user-123'
  const workoutId = 'w-1'
  const mockWorkout = {
    id: workoutId,
    userId,
    title: 'Test Workout',
    date: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getForUser', () => {
    it('should list workouts hiding duplicates by default', async () => {
      vi.mocked(prisma.workout.findMany).mockResolvedValue([mockWorkout] as any)

      await workoutRepository.getForUser(userId)

      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            isDuplicate: false
          }),
          orderBy: { date: 'desc' }
        })
      )
    })

    it('should include duplicates if requested', async () => {
      await workoutRepository.getForUser(userId, { includeDuplicates: true })

      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            isDuplicate: undefined
          })
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete a workout with userId check', async () => {
      vi.mocked(prisma.workout.delete).mockResolvedValue(mockWorkout as any)

      await workoutRepository.delete(workoutId, userId)

      expect(prisma.workout.delete).toHaveBeenCalledWith({
        where: { id: workoutId, userId }
      })
    })
  })

  describe('getById', () => {
    it('should find workout by id and user', async () => {
      vi.mocked(prisma.workout.findFirst).mockResolvedValue(mockWorkout as any)

      const result = await workoutRepository.getById(workoutId, userId)

      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { id: workoutId, userId },
        include: undefined
      })
      expect(result).toEqual(mockWorkout)
    })
  })

  describe('updateStatus', () => {
    it('should update aiAnalysisStatus', async () => {
      await workoutRepository.updateStatus(workoutId, 'COMPLETED')

      expect(prisma.workout.update).toHaveBeenCalledWith({
        where: { id: workoutId },
        data: { aiAnalysisStatus: 'COMPLETED' }
      })
    })
  })
})
