import { describe, expect, it } from 'vitest'
import {
  imageGenerator,
  normalizeWorkoutImageRatio,
  normalizeWorkoutImageStyle,
  normalizeWorkoutImageVariant,
  selectWorkoutImageTemplate
} from '../../../../../server/utils/sharing/image-generator'

const baseWorkout = {
  title: 'Morning Ride',
  type: 'Ride',
  date: new Date('2026-03-08T08:00:00Z'),
  durationSec: 3600,
  distanceMeters: 25000,
  averageHr: 145,
  averageWatts: 210,
  averageSpeed: 7
}

describe('workout image template selection', () => {
  it('uses the map template when route coordinates exist', () => {
    const template = selectWorkoutImageTemplate({
      ...baseWorkout,
      streams: {
        latlng: [
          [47.5, 19.04],
          [47.5005, 19.041],
          [47.501, 19.042]
        ]
      }
    })

    expect(template).toBe('activity-map')
  })

  it('falls back to the stat card template when route coordinates are missing', () => {
    const template = selectWorkoutImageTemplate({
      ...baseWorkout,
      streams: null
    })

    expect(template).toBe('activity-modern')
  })

  it('normalizes unsupported image variants to default', () => {
    expect(normalizeWorkoutImageVariant('transparent')).toBe('transparent')
    expect(normalizeWorkoutImageVariant('flat')).toBe('flat')
    expect(normalizeWorkoutImageVariant('unknown')).toBe('default')
    expect(normalizeWorkoutImageVariant()).toBe('default')
  })

  it('normalizes image styles and falls back to map', () => {
    expect(normalizeWorkoutImageStyle('poster')).toBe('poster')
    expect(normalizeWorkoutImageStyle('crest')).toBe('crest')
    expect(normalizeWorkoutImageStyle('pulse')).toBe('pulse')
    expect(normalizeWorkoutImageStyle('unknown')).toBe('map')
    expect(normalizeWorkoutImageStyle()).toBe('map')
  })

  it('normalizes image ratios and falls back to story', () => {
    expect(normalizeWorkoutImageRatio('story')).toBe('story')
    expect(normalizeWorkoutImageRatio('square')).toBe('square')
    expect(normalizeWorkoutImageRatio('post')).toBe('post')
    expect(normalizeWorkoutImageRatio('unknown')).toBe('story')
    expect(normalizeWorkoutImageRatio()).toBe('story')
  })

  it('shrinks and splits long text to fit the card', () => {
    const data = imageGenerator.prepareImageData({
      ...baseWorkout,
      title: 'Extremely Long Endurance Session With Repeats And Threshold Finish',
      distanceMeters: 123400
    })

    expect(data.titleLine1.length).toBeGreaterThan(0)
    expect(data.titleLine2.length).toBeGreaterThan(0)
    expect(Number(data.titleFontSizeMap)).toBeLessThan(72)
    expect(Number(data.heroFontSizeModern)).toBeLessThan(180)
  })

  it('scales typography down for square layouts', () => {
    const story = imageGenerator.prepareImageData(baseWorkout, 'story')
    const square = imageGenerator.prepareImageData(baseWorkout, 'square')

    expect(Number(square.titleFontSizeMap)).toBeLessThan(Number(story.titleFontSizeMap))
    expect(Number(square.heroFontSizeModern)).toBeLessThan(Number(story.heroFontSizeModern))
  })
})
