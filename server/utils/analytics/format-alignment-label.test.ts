import { describe, expect, it } from 'vitest'
import { formatAlignmentLabel } from './format-alignment-label'

describe('formatAlignmentLabel', () => {
  it('formats elapsed_time alignment regardless of distance units', () => {
    expect(formatAlignmentLabel(45, 'elapsed_time', 'Miles')).toBe('45s')
    expect(formatAlignmentLabel(125, 'elapsed_time', 'Miles')).toBe('2m')
    expect(formatAlignmentLabel(7260, 'elapsed_time', 'Miles')).toBe('2.0h')
  })

  it('formats percent_complete alignment regardless of distance units', () => {
    expect(formatAlignmentLabel(42.6, 'percent_complete', 'Miles')).toBe('43%')
  })

  describe('distance alignment', () => {
    it('renders kilometers/meters when distanceUnits is Kilometers', () => {
      expect(formatAlignmentLabel(500, 'distance', 'Kilometers')).toBe('500m')
      expect(formatAlignmentLabel(2500, 'distance', 'Kilometers')).toBe('2.5km')
    })

    it('renders kilometers/meters when distanceUnits is not provided', () => {
      expect(formatAlignmentLabel(500, 'distance')).toBe('500m')
      expect(formatAlignmentLabel(2500, 'distance')).toBe('2.5km')
    })

    it('renders feet/miles when distanceUnits is Miles', () => {
      // 300m is below the 1-mile threshold, so it renders in feet.
      expect(formatAlignmentLabel(300, 'distance', 'Miles')).toBe('984ft')
      // ~2 miles worth of meters renders in miles.
      expect(formatAlignmentLabel(3218.688, 'distance', 'Miles')).toBe('2.0mi')
    })
  })
})
