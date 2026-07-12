import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sanitizeBooleanStreamArray,
  sanitizeNumericStreamArray,
  workoutStreamRepository
} from '../../../../../server/utils/repositories/workoutStreamRepository'

const workoutStreamV2 = {
  upsert: vi.fn()
}

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workoutStream: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    get workoutStreamV2() {
      return workoutStreamV2
    }
  }
}))

describe('workoutStreamRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workoutStreamV2.upsert.mockResolvedValue({ id: 'stream-1' })
  })

  describe('sanitizeNumericStreamArray', () => {
    it('coerces null gaps to 0 while preserving array length', () => {
      expect(sanitizeNumericStreamArray([null, null, 88, 90] as unknown as number[])).toEqual([
        0, 0, 88, 90
      ])
    })
  })

  describe('sanitizeBooleanStreamArray', () => {
    it('coerces null gaps to false', () => {
      expect(sanitizeBooleanStreamArray([null, true, false] as unknown as boolean[])).toEqual([
        false,
        true,
        false
      ])
    })
  })

  describe('upsert', () => {
    it('sanitizes nullable cadence values before writing to WorkoutStreamV2', async () => {
      await workoutStreamRepository.upsert('workout-1', {
        cadence: [null, null, 88, 90] as unknown as number[]
      })

      expect(workoutStreamV2.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            cadence: [0, 0, 88, 90]
          }),
          update: expect.objectContaining({
            cadence: [0, 0, 88, 90]
          })
        })
      )
    })
  })
})
