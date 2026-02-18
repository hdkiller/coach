import { describe, it, expect } from 'vitest'
import {
  buildAnalysisRequestMetricRules,
  buildMetricPriorityPromptBlock,
  parseLoadPreference,
  resolveMetricPriorityContext,
  shouldCondenseHeartRateSection
} from '../../../trigger/utils/workout-metric-priority'

describe('workout metric priority', () => {
  it('parses load preference and preserves order', () => {
    expect(parseLoadPreference('PACE_HR_POWER')).toEqual(['PACE', 'HR', 'POWER'])
  })

  it('defaults to HR > POWER > PACE when preference is missing', () => {
    expect(parseLoadPreference(undefined)).toEqual(['HR', 'POWER', 'PACE'])
  })

  it('marks pace as primary and condenses HR when pace data is available', () => {
    const ctx = resolveMetricPriorityContext('PACE_HR_POWER', {
      lap_splits: [{ lap: 1 }],
      avg_hr: 130
    })

    expect(ctx.primaryMetric).toBe('PACE')
    expect(ctx.primaryMetricAvailable).toBe(true)
    expect(shouldCondenseHeartRateSection(ctx)).toBe(true)

    const promptBlock = buildMetricPriorityPromptBlock(ctx)
    expect(promptBlock).toContain('Preferred Metric Order')
    expect(promptBlock).toContain('Primary Metric for this analysis')
    expect(promptBlock).toContain('Do not make heart-rate zones the primary narrative')
  })

  it('adds explicit fallback guidance when primary pace metric is missing', () => {
    const ctx = resolveMetricPriorityContext('PACE_HR_POWER', {
      avg_hr: 128
    })

    expect(ctx.primaryMetric).toBe('PACE')
    expect(ctx.primaryMetricAvailable).toBe(false)
    expect(shouldCondenseHeartRateSection(ctx)).toBe(false)

    const rules = buildAnalysisRequestMetricRules(ctx)
    expect(rules.join(' ')).toContain('Primary metric PACE is unavailable')
  })
})
