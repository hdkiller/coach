import { describe, expect, it } from 'vitest'
import { buildPlanAdherencePrompt } from '../../../trigger/analyze-plan-adherence'

describe('buildPlanAdherencePrompt', () => {
  it('uses detected intervals when synced intervals are missing', () => {
    const prompt = buildPlanAdherencePrompt(
      {
        durationSec: 3606,
        tss: 41,
        averageWatts: 129,
        averageCadence: 85,
        normalizedPower: 135,
        averageHr: 126,
        ftp: 212,
        user: {
          ftp: 212,
          language: 'English'
        },
        streams: {
          time: Array.from({ length: 3609 }, (_, i) => i),
          watts: [
            ...Array.from({ length: 1200 }, () => 127),
            ...Array.from({ length: 480 }, () => 153),
            ...Array.from({ length: 120 }, () => 113),
            ...Array.from({ length: 480 }, () => 153),
            ...Array.from({ length: 120 }, () => 113),
            ...Array.from({ length: 480 }, () => 153),
            ...Array.from({ length: 729 }, () => 89)
          ],
          heartrate: Array.from({ length: 3609 }, () => 126),
          cadence: [
            ...Array.from({ length: 1200 }, () => 90),
            ...Array.from({ length: 480 }, () => 92),
            ...Array.from({ length: 120 }, () => 80),
            ...Array.from({ length: 480 }, () => 92),
            ...Array.from({ length: 120 }, () => 80),
            ...Array.from({ length: 480 }, () => 92),
            ...Array.from({ length: 729 }, () => 75)
          ]
        },
        rawJson: {}
      },
      {
        title: 'Baseline Soloist & Cadence',
        type: 'Ride',
        durationSec: 3600,
        structuredWorkout: {
          steps: [
            {
              type: 'Warmup',
              duration: 1200,
              power: { range: { start: 0.5, end: 0.7 }, unit: 'percentFtp' },
              cadence: 90
            },
            {
              reps: 3,
              steps: [
                {
                  type: 'Active',
                  duration: 480,
                  power: { value: 0.72, unit: 'percentFtp' },
                  cadence: 92
                },
                {
                  type: 'Rest',
                  duration: 120,
                  power: { value: 0.52, unit: 'percentFtp' },
                  cadence: 80
                }
              ]
            },
            {
              type: 'Cooldown',
              duration: 600,
              power: { range: { start: 0.5, end: 0.3 }, unit: 'percentFtp' },
              cadence: 75,
              ramp: true
            }
          ]
        }
      }
    )

    expect(prompt).toContain(
      'Source: stream-detected intervals (fallback because synced interval blocks were missing or weak)'
    )
    expect(prompt).toContain('Int 2:')
    expect(prompt).toContain('| WORK | 153W |')
    expect(prompt).toContain('cadence 92rpm')
    expect(prompt).toContain('| 92rpm |')
    expect(prompt).toContain('Cadence Hit Rate:')
    expect(prompt).not.toContain('ACTUAL INTERVALS:\n      - Source: none\n      N/A')
    expect(prompt).toContain(
      'If actual intervals come from stream-detected fallback, treat them as the best available execution evidence'
    )
  })
})
