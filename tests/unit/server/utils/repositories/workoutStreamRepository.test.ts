import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sanitizeBooleanStreamArray,
  sanitizeFloatStreamArray,
  sanitizeIntStreamArray,
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

  describe('sanitizeIntStreamArray', () => {
    it('coerces null gaps to 0 while preserving array length', () => {
      expect(sanitizeIntStreamArray([null, null, 88, 90] as unknown as number[])).toEqual([
        0, 0, 88, 90
      ])
    })

    it('truncates float values for Int[] columns', () => {
      expect(sanitizeIntStreamArray([118.9, null] as unknown as number[])).toEqual([118, 0])
    })
  })

  describe('sanitizeFloatStreamArray', () => {
    it('coerces null gaps to 0 while preserving array length', () => {
      expect(sanitizeFloatStreamArray([null, null, 12.5, 90] as unknown as number[])).toEqual([
        0, 0, 12.5, 90
      ])
    })

    it('promotes whole numbers so Prisma accepts Float[] arrays', () => {
      const result = sanitizeFloatStreamArray([null, 100, 200.5] as unknown as number[])
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(100 + 1e-9)
      expect(result[2]).toBe(200.5)
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

    it('sanitizes nullable distance values for Float[] columns', async () => {
      await workoutStreamRepository.upsert('workout-1', {
        distance: [null, null, 100, 200.5] as unknown as number[]
      })

      expect(workoutStreamV2.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            distance: [0, 0, 100 + 1e-9, 200.5]
          })
        })
      )
    })
  })
})
