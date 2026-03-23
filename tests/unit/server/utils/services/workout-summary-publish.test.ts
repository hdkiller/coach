import { describe, expect, it } from 'vitest'
import {
  hasWorkoutSummaryBlock,
  removeWorkoutSummaryBlock,
  upsertWorkoutSummaryBlock
} from '../../../../../server/utils/services/workout-summary-publish'

describe('workout summary publish helpers', () => {
  it('detects and removes CoachWatts summary blocks while preserving athlete notes', () => {
    const description = `CoachWatts Workout Analysis

Strong aerobic execution with good pacing.

🔗 https://CoachWatts.com - AI Endurance Coaching

Felt smooth until the final climb.`

    expect(hasWorkoutSummaryBlock(description)).toBe(true)
    expect(removeWorkoutSummaryBlock(description)).toBe('Felt smooth until the final climb.')
  })

  it('replaces an existing summary block instead of duplicating it', () => {
    const description = `CoachWatts Workout Analysis

Old summary.

🔗 https://CoachWatts.com - AI Endurance Coaching

User note.`

    const updated = upsertWorkoutSummaryBlock(description, 'New summary.')

    expect(updated).toContain('New summary.')
    expect(updated).toContain('User note.')
    expect(updated.match(/CoachWatts Workout Analysis/g)).toHaveLength(1)
  })

  it('returns false when no summary block exists', () => {
    expect(hasWorkoutSummaryBlock('Just the athlete note.')).toBe(false)
  })
})
