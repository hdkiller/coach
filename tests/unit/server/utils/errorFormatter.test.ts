import { describe, expect, it } from 'vitest'
import { formatErrorForLog } from '../../../../server/utils/errorFormatter'

describe('formatErrorForLog', () => {
  it('formats standard Error objects', () => {
    const err = new Error('Standard failure message')
    const formatted = formatErrorForLog(err) as Record<string, any>

    expect(formatted.name).toBe('Error')
    expect(formatted.message).toBe('Standard failure message')
    expect(formatted.stack).toContain('Error: Standard failure message')
  })

  it('formats Vercel AI SDK errors compactly without raw ASTs', () => {
    const aiError = new Error('Invalid prompt schema for tool')
    aiError.name = 'AI_TypeValidationError'
    ;(aiError as any)[Symbol.for('vercel.ai.error')] = true
    ;(aiError as any).cause = new Error('Zod validation failed at root.value')

    const formatted = formatErrorForLog(aiError) as Record<string, any>

    expect(formatted.name).toBe('AI_TypeValidationError')
    expect(formatted.message).toBe('Invalid prompt schema for tool')
    expect(formatted.cause).toBe('Zod validation failed at root.value')
    expect(formatted.stack).toBeUndefined()
  })

  it('handles non-Error objects safely', () => {
    expect(formatErrorForLog('String error')).toBe('String error')
    expect(formatErrorForLog({ name: 'CustomError', message: 'Failed' })).toEqual({
      name: 'CustomError',
      message: 'Failed'
    })
  })
})
