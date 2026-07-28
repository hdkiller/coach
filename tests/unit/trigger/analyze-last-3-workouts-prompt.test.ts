import { describe, expect, it } from 'vitest'
import { convertStructuredToMarkdown } from '../../../trigger/analyze-last-3-workouts'

describe('convertStructuredToMarkdown', () => {
  const baseAnalysis = {
    title: 'Last 3 Rides Review',
    date: 'Mar 1 - Mar 15, 2026',
    executive_summary: 'Solid progression across the last three rides.',
    sections: [],
    recommendations: [],
    metrics_summary: {
      total_duration_minutes: 180,
      total_tss: 250,
      avg_power: 220,
      avg_heart_rate: 145,
      // Stored canonically in kilometers (see schema comment in analyze-last-3-workouts.ts)
      total_distance_km: 100
    }
  }

  it('formats total distance in miles for a Miles-preference athlete', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis, 'Miles')

    // 100km -> ~62.14 mi
    expect(markdown).toContain('**Total Distance**: 62.14 mi')
    expect(markdown).not.toContain('100.0 km')
  })

  it('formats total distance in kilometers for a metric-preference athlete (unaffected)', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis, 'Kilometers')

    expect(markdown).toContain('**Total Distance**: 100.00 km')
  })

  it('defaults to kilometers when distanceUnits is not provided', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis)

    expect(markdown).toContain('**Total Distance**: 100.00 km')
  })
})
