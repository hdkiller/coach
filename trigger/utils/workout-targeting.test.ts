import { describe, expect, it } from 'vitest'
import { applyStepIntentGuard } from './workout-targeting'

function midpointOfRange(target: any) {
  if (!target) return null
  if (typeof target.value === 'number') return target.value
  if (
    target.range &&
    typeof target.range.start === 'number' &&
    typeof target.range.end === 'number'
  ) {
    return (target.range.start + target.range.end) / 2
  }
  return null
}

describe('applyStepIntentGuard', () => {
  it('preserves threshold HR targets and corrects the intent when the target is easier', () => {
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

    expect(step.intent).toBe('endurance')
    expect(step.heartRate?.units).toBe('bpm')
    const bpmMid = midpointOfRange(step.heartRate)
    expect(typeof bpmMid).toBe('number')
    expect(bpmMid).toBe((126 + 141) / 2)
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

  it('preserves explicit power targets and corrects the intent when they disagree', () => {
    const step: any = {
      type: 'Active',
      intent: 'endurance',
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
    expect(wattsMid).toBe(180)
    expect(step.intent).toBe('easy')
  })

  it('keeps 110% FTP VO2 targets intact', () => {
    const step: any = {
      type: 'Active',
      intent: 'endurance',
      primaryTarget: 'power',
      power: { value: 1.1, units: '%' }
    }

    applyStepIntentGuard(step, {
      ftp: 290,
      lthr: 168,
      thresholdPace: 0
    })

    expect(step.power).toEqual({ value: 1.1, units: '%' })
    expect(step.intent).toBe('vo2')
  })
})
