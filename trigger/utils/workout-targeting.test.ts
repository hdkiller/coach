import { describe, expect, it } from 'vitest'
import { applyStepIntentGuard } from './workout-targeting'

function midpointOfRange(target: any) {
  if (!target) return null
  if (typeof target.value === 'number') return target.value
  if (target.range && typeof target.range.start === 'number' && typeof target.range.end === 'number') {
    return (target.range.start + target.range.end) / 2
  }
  return null
}

describe('applyStepIntentGuard', () => {
  it('clamps threshold HR steps upward when target is too easy', () => {
    const step: any = {
      type: 'Active',
      intent: 'threshold',
      primaryTarget: 'heartRate',
      heartRate: {
        range: { start: 126, end: 141 },
        units: 'bpm'
      }
    }

    applyStepIntentGuard(step, {
      ftp: 250,
      lthr: 168,
      thresholdPace: 0
    })

    expect(step.intent).toBe('threshold')
    expect(step.heartRate?.units).toBe('bpm')
    const bpmMid = midpointOfRange(step.heartRate)
    expect(typeof bpmMid).toBe('number')
    const factor = (bpmMid as number) / 168
    expect(factor).toBeGreaterThanOrEqual(0.92)
    expect(factor).toBeLessThanOrEqual(1.02)
  })

  it('assigns default intent from step type when missing', () => {
    const step: any = {
      type: 'Warmup',
      primaryTarget: 'heartRate',
      heartRate: { value: 180, units: 'bpm' }
    }

    applyStepIntentGuard(step, {
      ftp: 250,
      lthr: 168,
      thresholdPace: 0
    })

    expect(step.intent).toBe('warmup')
    expect(step.heartRate?.units).toBe('bpm')
    const bpmMid = midpointOfRange(step.heartRate)
    expect((bpmMid as number) / 168).toBeLessThanOrEqual(0.7)
  })

  it('clamps VO2 power steps upward in watts (cross-sport behavior)', () => {
    const step: any = {
      type: 'Active',
      intent: 'vo2',
      primaryTarget: 'power',
      power: { value: 180, units: 'watts' }
    }

    applyStepIntentGuard(step, {
      ftp: 250,
      lthr: 168,
      thresholdPace: 0
    })

    expect(step.power?.units).toBe('watts')
    const wattsMid = midpointOfRange(step.power)
    expect(typeof wattsMid).toBe('number')
    const factor = (wattsMid as number) / 250
    expect(factor).toBeGreaterThanOrEqual(1.03)
    expect(factor).toBeLessThanOrEqual(1.12)
  })
})

