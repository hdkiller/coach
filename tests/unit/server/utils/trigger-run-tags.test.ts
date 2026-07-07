import { describe, expect, it } from 'vitest'
import {
  buildUserRunTags,
  structureGenerationRunTags
} from '../../../../server/utils/trigger-run-tags'

describe('trigger-run-tags', () => {
  it('buildUserRunTags always includes user tag first', () => {
    expect(buildUserRunTags('user-1')).toEqual(['user:user-1'])
  })

  it('buildUserRunTags deduplicates extra tags', () => {
    expect(buildUserRunTags('user-1', ['planned-workout:pw-1', 'planned-workout:pw-1'])).toEqual([
      'user:user-1',
      'planned-workout:pw-1'
    ])
  })

  it('structureGenerationRunTags includes planned workout and source tags', () => {
    expect(
      structureGenerationRunTags({
        userId: 'user-1',
        plannedWorkoutId: 'pw-1',
        source: 'api'
      })
    ).toEqual(['user:user-1', 'planned-workout:pw-1', 'source:api'])
  })

  it('structureGenerationRunTags supports workout templates', () => {
    expect(
      structureGenerationRunTags({
        userId: 'user-1',
        workoutTemplateId: 'tpl-1',
        source: 'library'
      })
    ).toEqual(['user:user-1', 'workout-template:tpl-1', 'source:library'])
  })
})
