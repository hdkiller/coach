import { describe, expect, it } from 'vitest'
import { buildWorkoutAnalysisFacts, buildWorkoutAnalysisFactsV2 } from './workout-analysis-facts'

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

  it('produces interpretable decoupling and durability facts for a steady endurance ride', () => {
    const time = Array.from({ length: 720 }, (_, index) => index * 5)
    const watts = Array.from({ length: 720 }, () => 205)
    const heartrate = Array.from({ length: 720 }, (_, index) => (index < 120 ? 138 : 142))

    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        title: 'Steady Endurance Ride',
        durationSec: 3600,
        averageWatts: 205,
        averageHr: 141,
        intensity: 0.76,
        variabilityIndex: 1.03,
        streams: {
          time,
          watts,
          heartrate,
          powerZoneTimes: [300, 2400, 900, 0, 0],
          hrZoneTimes: [120, 1800, 1680, 0, 0]
        }
      })
    })

    expect(facts.guardrails.archetype.primaryArchetype).toBe('endurance')
    expect(facts.performanceSignals.decoupling.interpretable).toBe(true)
    expect(facts.performanceSignals.durability.lateSessionFadePct).not.toBeNull()
    expect(facts.performanceSignals.zones.dominantPowerZone).toBe('Z2')
  })

  it('suppresses classic decoupling for intervalled sessions while keeping repeatability signals', () => {
    const intervals = [
      { type: 'WORK', moving_time: 180, average_watts: 320, intensity: 1.18 },
      { type: 'REST', moving_time: 180, average_watts: 160, intensity: 0.6 },
      { type: 'WORK', moving_time: 180, average_watts: 315, intensity: 1.16 },
      { type: 'REST', moving_time: 180, average_watts: 150, intensity: 0.58 },
      { type: 'WORK', moving_time: 180, average_watts: 305, intensity: 1.12 }
    ]

    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        title: 'VO2 Session',
        durationSec: 3600,
        averageWatts: 230,
        averageHr: 152,
        intensity: 0.93,
        variabilityIndex: 1.15,
        rawJson: { icu_intervals: intervals },
        streams: {
          time: Array.from({ length: 720 }, (_, index) => index * 5),
          watts: Array.from({ length: 720 }, (_, index) => (index % 120 < 60 ? 320 : 150)),
          heartrate: Array.from({ length: 720 }, (_, index) => (index % 120 < 60 ? 165 : 135))
        }
      })
    })

    expect(facts.guardrails.archetype.sessionSteadiness).toBe('intervalled')
    expect(facts.performanceSignals.decoupling.interpretable).toBe(false)
    expect(facts.performanceSignals.durability.repeatabilityScore).not.toBeNull()
  })

  it('computes adherence metrics for a linked structured workout', () => {
    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        title: 'Threshold Session',
        type: 'Ride',
        durationSec: 3600,
        rawJson: {
          icu_intervals: [
            { type: 'WORK', moving_time: 600, average_watts: 248, intensity: 0.99 },
            { type: 'REST', moving_time: 300, average_watts: 150, intensity: 0.6 },
            { type: 'WORK', moving_time: 600, average_watts: 252, intensity: 1.01 }
          ]
        }
      }),
      sportSettings: { ftp: 250 },
      plannedWorkout: {
        structuredWorkout: {
          steps: [
            { type: 'Warmup', durationSeconds: 600, power: { value: 0.6, units: '%' } },
            { type: 'Interval', durationSeconds: 600, power: { value: 1.0, units: '%' } },
            { type: 'Rest', durationSeconds: 300, power: { value: 0.6, units: '%' } },
            { type: 'Interval', durationSeconds: 600, power: { value: 1.0, units: '%' } }
          ]
        },
        durationSec: 3600
      }
    })

    expect(facts.adherence.planLinked).toBe(true)
    expect(facts.adherence.adherenceAssessable).toBe(true)
    expect(facts.adherence.structureMatched).toBe(true)
    expect(facts.adherence.workIntervalHitRate).toBeGreaterThanOrEqual(50)
    expect(facts.adherence.executionClassification).toBe('as_prescribed')
  })

  it('marks outdoor substitutions as not fully assessable when no actual intervals exist', () => {
    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        title: 'Outdoor Endurance Ride',
        type: 'Ride',
        durationSec: 4200
      }),
      plannedWorkout: {
        durationSec: 3600,
        structuredWorkout: {
          steps: [{ type: 'Interval', durationSeconds: 1200, power: { value: 0.8, units: '%' } }]
        }
      }
    })

    expect(facts.adherence.adherenceAssessable).toBe(false)
    expect(facts.adherence.executionClassification).toBe('unstructured_substitution')
  })

  it('uses pace-first guardrails for runs with velocity data', () => {
    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        type: 'Run',
        averageSpeed: 12.2,
        averageWatts: 280,
        streams: {
          velocity: Array.from({ length: 600 }, () => 3.4),
          heartrate: Array.from({ length: 600 }, () => 150),
          cadence: Array.from({ length: 600 }, () => 168)
        }
      })
    })

    expect(facts.guardrails.archetype.primaryMetric).toBe('pace')
    expect(facts.guardrails.telemetry.paceUsable).toBe(true)
    expect(facts.guardrails.telemetry.gpsConfidence).toBe('high')
  })

  it('classifies zwift rides as indoor resistance when trainer flag is missing', () => {
    const facts = buildWorkoutAnalysisFactsV2({
      workout: makeWorkout({
        type: 'VirtualRide',
        source: 'zwift',
        trainer: false,
        deviceName: 'Zwift',
        title: 'Zwift - Tempus Fugit',
        variabilityIndex: 1.04
      })
    })

    expect(facts.guardrails.archetype.executionEnvironment).toBe('indoor_resistance')
  })
})
