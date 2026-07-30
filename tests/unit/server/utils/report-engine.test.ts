import { describe, expect, it } from 'vitest'
import { convertStructuredToMarkdown } from '../../../../server/utils/report-engine'

describe('convertStructuredToMarkdown', () => {
  const baseAnalysis = {
    title: 'Weekly Analysis',
    date: '2026-07-21 to 2026-07-27',
    executive_summary: 'Solid week overall.',
    metrics_summary: {
      total_duration_minutes: 320,
      total_tss: 410,
      avg_power: 210,
      avg_heart_rate: 145,
      total_distance_km: 42.195
    }
  }

  it('formats total distance in kilometers when the athlete prefers Kilometers', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis, 'Kilometers')

    expect(markdown).toContain('**Total Distance**: 42.20 km')
    expect(markdown).not.toMatch(/\bmi\b/)
  })

  it('formats total distance in kilometers when distanceUnits is not provided', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis)

    expect(markdown).toContain('**Total Distance**: 42.20 km')
  })

  it('formats total distance in miles when the athlete prefers Miles', () => {
    const markdown = convertStructuredToMarkdown(baseAnalysis, 'Miles')

    expect(markdown).toContain('**Total Distance**: 26.22 mi')
    expect(markdown).not.toContain('km')
  })

  it('omits the distance line entirely when no distance metric is present', () => {
    const analysisWithoutDistance = {
      ...baseAnalysis,
      metrics_summary: { ...baseAnalysis.metrics_summary, total_distance_km: undefined }
    }

    const markdown = convertStructuredToMarkdown(analysisWithoutDistance, 'Miles')

    expect(markdown).not.toContain('Total Distance')
  })
})
