import { describe, expect, it } from 'vitest'
import { resolveModelId } from '../../../server/utils/ai-config'

describe('resolveModelId', () => {
  it('maps deprecated gemini-3-pro-preview to gemini-3-flash-preview', () => {
    expect(resolveModelId('gemini-3-pro-preview')).toBe('gemini-3-flash-preview')
  })

  it('maps deprecated gemini-2.5-flash to gemini-3.1-flash-lite-preview', () => {
    expect(resolveModelId('gemini-2.5-flash')).toBe('gemini-3.1-flash-lite-preview')
  })

  it('returns unknown model ids unchanged', () => {
    expect(resolveModelId('gemini-3-flash-preview')).toBe('gemini-3-flash-preview')
  })
})
