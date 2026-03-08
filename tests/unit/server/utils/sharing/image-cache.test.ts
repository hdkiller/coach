import { describe, expect, it } from 'vitest'
import { buildWorkoutImageCacheKey } from '../../../../../server/utils/sharing/image-cache'

const baseWorkout = {
  id: 'workout-1',
  title: 'Morning Ride',
  type: 'Ride',
  date: new Date('2026-03-08T08:00:00Z'),
  durationSec: 3600,
  distanceMeters: 25000,
  averageHr: 145,
  averageWatts: 210,
  averageSpeed: 7,
  streams: {
    latlng: [
      [47.5, 19.04],
      [47.5005, 19.041]
    ],
    heartrate: [120, 132, 145]
  }
}

describe('workout image cache key', () => {
  it('returns a stable key for the same render inputs', () => {
    const first = buildWorkoutImageCacheKey({
      workout: baseWorkout,
      style: 'pulse',
      variant: 'default',
      ratio: 'story'
    })
    const second = buildWorkoutImageCacheKey({
      workout: baseWorkout,
      style: 'pulse',
      variant: 'default',
      ratio: 'story'
    })

    expect(first).toBe(second)
    expect(first).toContain('share:image:share-image-v1:workout-1:pulse:default:story:')
  })

  it('changes when render-relevant workout data changes', () => {
    const first = buildWorkoutImageCacheKey({
      workout: baseWorkout,
      style: 'pulse',
      variant: 'default',
      ratio: 'story'
    })
    const second = buildWorkoutImageCacheKey({
      workout: {
        ...baseWorkout,
        title: 'Evening Ride'
      },
      style: 'pulse',
      variant: 'default',
      ratio: 'story'
    })

    expect(first).not.toBe(second)
  })
})
