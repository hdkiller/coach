import { describe, it, expect } from 'vitest'
import { formatPromptHeight } from '../../../../server/utils/ai-prompt-format'

describe('formatPromptHeight', () => {
  it('returns a feet/inches string when heightUnits is ft/in', () => {
    // 180.34 cm ~= 5'11"
    const result = formatPromptHeight(180.34, 'ft/in')

    expect(result).toBe(`5'11"`)
  })

  it('carries inches into feet when rounding lands on 12"', () => {
    // 181.61 cm => 71.5 total inches => rounds to 5'12" without the carry fix
    const result = formatPromptHeight(181.61, 'ft/in')

    expect(result).toBe(`6'0"`)
  })

  it('returns a cm string when heightUnits is cm', () => {
    const result = formatPromptHeight(180, 'cm')

    expect(result).toBe('180 cm')
  })

  it('defaults to cm when heightUnits is missing/unrecognized', () => {
    expect(formatPromptHeight(175, undefined)).toBe('175 cm')
    expect(formatPromptHeight(175, null)).toBe('175 cm')
    expect(formatPromptHeight(175, 'Centimeters')).toBe('175 cm')
  })

  it('returns Unknown when height is null or undefined', () => {
    expect(formatPromptHeight(null, 'ft/in')).toBe('Unknown')
    expect(formatPromptHeight(undefined, 'cm')).toBe('Unknown')
  })
})
