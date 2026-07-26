import { describe, it, expect } from 'vitest'
import {
  buildWorkoutSummary,
  buildConciseWorkoutSummary,
  loadFlatFileMock
} from '../../../../server/utils/gemini'

describe('Gemini Utility & Prompt Formatters', () => {
  it('formats workout summaries correctly in buildWorkoutSummary', () => {
    const mockWorkouts = [
      {
        id: 'w1',
        title: 'Tempo Ride',
        type: 'Ride',
        date: new Date('2026-03-10T10:00:00Z'),
        durationSec: 3600,
        tss: 65,
        averageHr: 145,
        maxHr: 168,
        averagePower: 210,
        maxPower: 350
      }
    ]

    const summary = buildWorkoutSummary(mockWorkouts, 'UTC')

    expect(summary).toContain('Workout 1: Tempo Ride')
    expect(summary).toContain('- **Type**: Ride')
    expect(summary).toContain('- **Duration**: 60 minutes')
    expect(summary).toContain('- **TSS**: 65')
    expect(summary).toContain('- **Average HR**: 145 bpm')
  })

  it('builds concise workout summaries for AI prompts', () => {
    const mockWorkouts = [
      {
        title: 'Interval Run',
        type: 'Run',
        date: new Date('2026-03-09T08:00:00Z'),
        durationSec: 2700,
        tss: 50
      }
    ]

    const concise = buildConciseWorkoutSummary(mockWorkouts, 'UTC')

    expect(concise).toContain('Run - Interval Run')
    expect(concise).toContain('45m')
    expect(concise).toContain('TSS: 50')
  })

  it('loads flat file mocks with fallback mechanism', () => {
    const mockData = loadFlatFileMock('unknown_operation_xyz')
    expect(mockData).toBeDefined()
  })
})
