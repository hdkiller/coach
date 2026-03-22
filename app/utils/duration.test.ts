import { describe, expect, it } from 'vitest'
import { formatCompactDuration } from './duration'

describe('formatCompactDuration', () => {
  it('formats seconds-only durations', () => {
    expect(formatCompactDuration(45)).toBe('45s')
  })

  it('formats minute-and-second durations readably', () => {
    expect(formatCompactDuration(450)).toBe('7m 30s')
  })

  it('formats hour-based durations compactly', () => {
    expect(formatCompactDuration(5400)).toBe('1h 30m')
  })

  it('returns 0s for invalid values', () => {
    expect(formatCompactDuration(undefined)).toBe('0s')
  })
})
