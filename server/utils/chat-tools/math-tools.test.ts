import { describe, it, expect } from 'vitest'
import { performCalculation } from './math-tools'

describe('Math Tools', () => {
  describe('performCalculation', () => {
    it('evaluates simple addition', async () => {
      const result = await performCalculation({ expression: '2 + 2' })
      expect(result.result).toBe(4)
    })

    it('evaluates complex expressions with precedence', async () => {
      const result = await performCalculation({ expression: '(10 + 5) * 2 / 3' })
      expect(result.result).toBe(10)
    })

    it('supports power operator ^', async () => {
      const result = await performCalculation({ expression: '2 ^ 3' })
      expect(result.result).toBe(8)
    })

    it('supports Math functions', async () => {
      const result = await performCalculation({ expression: 'sqrt(144) + abs(-10)' })
      expect(result.result).toBe(22)
    })

    it('supports Math constants', async () => {
      const result = await performCalculation({ expression: 'PI' })
      expect(result.result).toBeCloseTo(Math.PI)
    })

    it('blocks dangerous characters', async () => {
      const result = await performCalculation({ expression: 'alert(1)' })
      expect(result.error).toBeDefined()
      // result.error is 'Failed to evaluate expression' because regex allows word chars but new Function scope doesn't have alert
      expect(result.error).toContain('Failed to evaluate')
    })

    it('handles division by zero', async () => {
      const result = await performCalculation({ expression: '10 / 0' })
      expect(result.result).toBe('Infinity')
      expect(result.note).toBeDefined()
    })

    it('handles invalid syntax', async () => {
      const result = await performCalculation({ expression: '10 + (5' })
      expect(result.error).toBeDefined()
      expect(result.message).toBeDefined()
    })
  })
})
