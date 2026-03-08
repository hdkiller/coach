import { describe, expect, it } from 'vitest'
import { buildWorkoutAnalysisFacts } from './workout-analysis-facts'

function makeWorkout(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workout-1',
    title: 'Debug Workout',
    type: 'Ride',
    durationSec: 5400,
    trainingLoad: 120,
    tss: 110,
    averageWatts: 210,
    averageHr: 145,
    decoupling: 4.2,
    trainer: false,
    streams: null,
    ...overrides
  }
}

describe('buildWorkoutAnalysisFacts', () => {
  it('treats zero-heavy heart-rate streams as unusable telemetry', () => {
    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        streams: {
          heartrate: [0, 0, 0, 120, 122, 0, 0, 0],
          watts: [100, 120, 140, 160, 170, 150, 130, 110]
        }
      })
    })

    expect(facts.telemetry.hrUsable).toBe(false)
    expect(facts.telemetry.hrArtifactFlag).toBe(true)
    expect(facts.debugMeta.disabledInterpretations.join(' ')).toContain('Heart-rate-derived')
  })

  it('marks running power as estimated and avoids absolute power use', () => {
    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        type: 'Run',
        averageSpeed: 12.5,
        averageWatts: 290
      })
    })

    expect(facts.telemetry.powerSourceType).toBe('estimated')
    expect(facts.telemetry.powerAbsoluteUsable).toBe(false)
    expect(facts.telemetry.powerRelativeUsable).toBe(true)
    expect(facts.telemetry.analysisMode).toBe('pace')
  })

  it('detects efficiency gain when later power/hr ratio improves after warm-up exclusion', () => {
    const time = Array.from({ length: 180 }, (_, index) => index * 30)
    const watts = Array.from({ length: 180 }, (_, index) => (index < 90 ? 200 : 205))
    const heartrate = Array.from({ length: 180 }, (_, index) => (index < 90 ? 150 : 142))

    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        durationSec: 5400,
        streams: {
          time,
          watts,
          heartrate
        }
      })
    })

    expect(facts.physiology.decouplingValid).toBe(true)
    expect(facts.physiology.decouplingDirection).toBe('efficiency_gain')
  })

  it('flags expected hr lag during sharp power onsets', () => {
    const time = Array.from({ length: 80 }, (_, index) => index * 6)
    const watts = Array.from({ length: 80 }, (_, index) => (index < 20 ? 120 : 260))
    const heartrate = Array.from({ length: 80 }, (_, index) => {
      if (index < 20) return 120
      if (index < 30) return 122
      return 132
    })

    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        durationSec: 5400,
        streams: {
          time,
          watts,
          heartrate
        }
      })
    })

    expect(facts.physiology.normalHrLagExpected).toBe(true)
    expect(facts.physiology.normalHrLagDetected).toBe(true)
  })

  it('disables cargo e-bike lr balance interpretation and can correct suspected inversion', () => {
    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        deviceName: 'Bulcan Cargo Module',
        lrBalance: 68
      })
    })

    expect(facts.lrBalance.sourceSemantics).toBe('human_vs_motor')
    expect(facts.lrBalance.inversionSuspected).toBe(true)
    expect(facts.lrBalance.interpretationMode).toBe('corrected')
  })

  it('marks unavailable lr balance fields as ignored for prompt inclusion', () => {
    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        lrBalance: null
      })
    })

    expect(facts.lrBalance.sourceSemantics).toBe('unknown')
    expect(facts.lrBalance.interpretationMode).toBe('disabled')
    // correctionReason is included because it's non-null and explains why it's disabled
    expect(facts.debugMeta.promptDecisions['lrBalance.correctionReason'].include).toBe(true)
  })

  it('detects ERG from tightly locked target power intervals', () => {
    const targetPower = Array.from({ length: 80 }, (_, index) => 220)
    const watts = targetPower.map((value, index) => value + (index % 2 === 0 ? 2 : -2))
    const cadence = Array.from({ length: 80 }, (_, index) => 82 + (index % 12))

    const facts = buildWorkoutAnalysisFacts({
      workout: makeWorkout({
        trainer: true,
        streams: {
          targetPower,
          watts,
          cadence
        }
      }),
      plannedWorkout: {
        structuredWorkout: { steps: [] }
      }
    })

    expect(facts.erg.detected).toBe(true)
    expect(facts.erg.powerControlMode).toBe('erg')
  })
})
