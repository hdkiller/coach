import { describe, expect, it } from 'vitest'
import { normalizeSubjectSpacing } from '../../../../server/utils/workout-insight-email'

describe('workout insight email subject formatting', () => {
  it('adds missing spacing after punctuation around interpolated values', () => {
    const subject = 'Great shift, Anderd93.66.7 km in the books.'
    expect(normalizeSubjectSpacing(subject)).toBe('Great shift, Anderd93. 66.7 km in the books.')
  })

  it('preserves numeric punctuation for distances and thousands', () => {
    const subject = 'Great shift, Alex. 66.7 km logged with 1,000 kJ.'
    expect(normalizeSubjectSpacing(subject)).toBe(
      'Great shift, Alex. 66.7 km logged with 1,000 kJ.'
    )
  })
})
