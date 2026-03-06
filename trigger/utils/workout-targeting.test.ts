import { describe, expect, it } from 'vitest'
import { applyStepIntentGuard, applyTargetFormatPolicyToStep } from './workout-targeting'

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

describe('applyTargetFormatPolicyToStep', () => {
  it('maps pace zone index targets to configured zone bounds in zone mode', () => {
    const step: any = {
      type: 'Active',
      primaryTarget: 'pace',
      pace: { value: 1, units: 'zone' }
    }

    applyTargetFormatPolicyToStep(
      step,
      {
        heartRate: { mode: 'percentLthr', preferRange: true },
        power: { mode: 'percentFtp', preferRange: true },
        pace: { mode: 'zone', preferRange: true },
        cadence: { mode: 'rpm' }
      },
      {
        ftp: 250,
        lthr: 168,
        maxHr: 185,
        thresholdPace: 2.345,
        hrZones: [],
        powerZones: [],
        paceZones: [
          { min: 1.41, max: 1.83, name: 'Z1 Easy' },
          { min: 1.83, max: 2.06, name: 'Z2 Endurance' }
        ]
      }
    )

    expect(step.pace).toMatchObject({
      range: { start: 1.41, end: 1.83 },
      units: 'm/s'
    })
  })

  it('treats ambiguous high Pace values as absolute speed in zone mode', () => {
    const step: any = {
      type: 'Active',
      primaryTarget: 'pace',
      pace: {
        range: { start: 2.44, end: 2.48 },
        units: 'Pace'
      }
    }

    applyTargetFormatPolicyToStep(
      step,
      {
        heartRate: { mode: 'percentLthr', preferRange: true },
        power: { mode: 'percentFtp', preferRange: true },
        pace: { mode: 'zone', preferRange: true },
        cadence: { mode: 'rpm' }
      },
      {
        ftp: 250,
        lthr: 168,
        maxHr: 185,
        thresholdPace: 2.345,
        hrZones: [],
        powerZones: [],
        paceZones: [
          { min: 1.41, max: 1.83, name: 'Z1 Easy' },
          { min: 1.83, max: 2.06, name: 'Z2 Endurance' },
          { min: 2.06, max: 2.23, name: 'Z3 Tempo' },
          { min: 2.23, max: 2.39, name: 'Z4 Threshold' },
          { min: 2.39, max: 2.53, name: 'Z5 VO2' }
        ]
      }
    )

    expect(step.pace).toMatchObject({
      range: { start: 2.39, end: 2.53 },
      units: 'm/s'
    })
  })
})
