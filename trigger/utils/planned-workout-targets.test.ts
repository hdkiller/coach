import { describe, expect, it } from 'vitest'
import { formatStructuredPlanForPrompt } from './planned-workout-targets'

describe('formatStructuredPlanForPrompt', () => {
  it('uses numeric power targets instead of stale step title labels', () => {
    const structuredWorkout = {
      steps: [
        {
          type: 'Active',
          name: 'Under (95% FTP)',
          durationSeconds: 600,
          power: { value: 150, units: 'W' }
        }
      ]
    }

    const output = formatStructuredPlanForPrompt(structuredWorkout, { ftp: 200 })

    expect(output).toContain('Step 1 [Active]: 10m @ 150W')
    expect(output).not.toContain('95% FTP')
  })

  it('formats ratio-based power targets with computed watts when ftp is available', () => {
    const structuredWorkout = {
      steps: [
        {
          type: 'Active',
          durationSeconds: 300,
          power: { value: 0.75 }
        }
      ]
    }

    const output = formatStructuredPlanForPrompt(structuredWorkout, { ftp: 250 })

    expect(output).toContain('Step 1 [Active]: 5m @ 75% FTP (~188W)')
  })

  it('supports legacy array-based structures and nested repeated steps', () => {
    const legacy = [
      {
        type: 'Active',
        reps: 2,
        steps: [
          { type: 'Active', duration_s: 180, target_value: 220, target_type: 'POWER' },
          { type: 'Rest', duration_s: 120, power: { value: 0.5 } }
        ]
      }
    ]

    const output = formatStructuredPlanForPrompt(legacy, { ftp: 200 })
    const lines = output.split('\n')

    expect(lines.length).toBe(5)
    expect(lines[1]).toContain('Step 2 [Active]: 3m @ 220W')
    expect(lines[2]).toContain('Step 3 [Rest]: 2m @ 50% FTP (~100W)')
    expect(lines[4]).toContain('Step 5 [Rest]: 2m @ 50% FTP (~100W)')
  })
})
