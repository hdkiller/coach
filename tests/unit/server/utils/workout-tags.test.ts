import { describe, expect, it } from 'vitest'
import {
  mergeWorkoutTags,
  normalizeTagList,
  parseTagQueryParam,
  toIntervalsTag,
  toLocalTag
} from '../../../../server/utils/workout-tags'

describe('workout tags', () => {
  it('normalizes local and intervals tags consistently', () => {
    expect(toLocalTag('  Threshold  ')).toBe('threshold')
    expect(toLocalTag('icu:threshold')).toBeNull()
    expect(toIntervalsTag('  VO2 Max ')).toBe('icu:vo2 max')
    expect(toIntervalsTag('icu:RECOVERY')).toBe('icu:recovery')
  })

  it('merges intervals tags while preserving local tags', () => {
    expect(
      mergeWorkoutTags(['tempo', 'icu:old'], {
        incomingIntervalsTags: ['Recovery', 'Tempo Session']
      })
    ).toEqual(['icu:recovery', 'icu:tempo session', 'tempo'])
  })

  it('supports local tag replacement and mixed query parsing', () => {
    expect(
      mergeWorkoutTags(['tempo', 'icu:recovery'], {
        setLocalTags: ['Race Prep', 'Tempo'],
        removeTags: ['tempo']
      })
    ).toEqual(['icu:recovery', 'race prep'])

    expect(normalizeTagList(['Tempo', 'tempo', '  race prep  '], 'local')).toEqual([
      'race prep',
      'tempo'
    ])

    expect(parseTagQueryParam('Tempo,icu:Recovery,race prep')).toEqual([
      'icu:recovery',
      'race prep',
      'tempo'
    ])
  })
})
