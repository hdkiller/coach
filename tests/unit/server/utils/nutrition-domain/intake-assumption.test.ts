import { describe, expect, it } from 'vitest'
import { calculateEnergyTimeline } from '../../../../../server/utils/nutrition-domain/metabolic-simulation'
import { summariseIntakeConfidence } from '../../../../../server/utils/nutrition/intake-confidence'

const TIMEZONE = 'UTC'
const DATE = '2026-07-22'
const PAST_NOW = new Date(`${DATE}T23:59:00Z`)

const settings = {
  weight: 80,
  bmr: 1700,
  metabolicFloor: 0.6,
  fuelState1Min: 2.5,
  mealPattern: [
    { name: 'Breakfast', time: '07:00' },
    { name: 'Lunch', time: '12:00' },
    { name: 'Dinner', time: '19:00' }
  ]
}

function run(record: any = {}, workouts: any[] = [], now: Date = PAST_NOW) {
  return calculateEnergyTimeline(
    { date: DATE, carbsGoal: 300, ...record },
    workouts,
    settings,
    TIMEZONE,
    undefined,
    { startingGlycogenPercentage: 60, startingFluidDeficit: 0, now }
  )
}

const endLevel = (points: any[]) => points[points.length - 1].level

describe('intake on days with nothing logged', () => {
  it('does not model the athlete as having fasted', () => {
    // Previously a past day with no logs took no intake at all, so it drained toward empty. Against
    // production that bottomed out half of every training day.
    const points = run()
    expect(endLevel(points)).toBeGreaterThan(30)
  })

  it('does not top the tank up either', () => {
    // Assuming the full plan target every day pinned 31% of production intervals at 100%.
    const points = run()
    expect(endLevel(points)).toBeLessThan(100)
  })

  it('leaves a rest day roughly where it started', () => {
    // No information should mean no movement: an unlogged rest day is modelled at energy balance.
    const points = run()
    expect(endLevel(points)).toBeGreaterThan(50)
    expect(endLevel(points)).toBeLessThan(72)
  })

  it('still lets a hard session show as a cost', () => {
    const withSession = run({}, [
      {
        id: 'w1',
        title: 'Long Ride',
        type: 'Ride',
        date: new Date(`${DATE}T00:00:00Z`),
        startTime: new Date(`${DATE}T09:00:00Z`),
        durationSec: 4 * 3600,
        workIntensity: 0.85
      }
    ])

    const restDay = run()
    const sessionMin = Math.min(...withSession.map((p) => p.level))
    const restMin = Math.min(...restDay.map((p) => p.level))

    expect(sessionMin).toBeLessThan(restMin)
  })

  it('marks the day as assumed rather than measured', () => {
    expect(run()[0]!.intakeProvenance).toBe('assumed')
  })
})

describe('intake provenance', () => {
  it('marks a day with logged food as measured', () => {
    const points = run({
      breakfast: [{ name: 'Oats', carbs: 80, calories: 400, logged_at: `${DATE}T07:00:00Z` }]
    })
    expect(points[0]!.intakeProvenance).toBe('logged')
  })

  it('marks a future day as projected', () => {
    const points = run({}, [], new Date(`${DATE}T00:00:00Z`))
    expect(points[0]!.intakeProvenance).toBe('projected')
  })
})

describe('summariseIntakeConfidence', () => {
  const day = (dateKey: string, intakeProvenance: string) => ({ dateKey, intakeProvenance }) as any

  it('reports a curve built mostly on the plan as inferred', () => {
    const points = [
      day('2026-07-18', 'assumed'),
      day('2026-07-19', 'assumed'),
      day('2026-07-20', 'assumed'),
      day('2026-07-21', 'assumed'),
      day('2026-07-22', 'logged')
    ]
    const confidence = summariseIntakeConfidence(points)

    expect(confidence.measuredDays).toBe(1)
    expect(confidence.totalDays).toBe(5)
    expect(confidence.level).toBe('inferred')
  })

  it('reports a well-logged curve as measured', () => {
    const points = [day('2026-07-20', 'logged'), day('2026-07-21', 'logged')]
    expect(summariseIntakeConfidence(points).level).toBe('measured')
  })

  it('reports a mixed curve as partial', () => {
    const points = [
      day('2026-07-20', 'logged'),
      day('2026-07-21', 'assumed'),
      day('2026-07-22', 'assumed')
    ]
    expect(summariseIntakeConfidence(points).level).toBe('partial')
  })

  it('handles an empty curve without dividing by zero', () => {
    const confidence = summariseIntakeConfidence([])
    expect(confidence.level).toBe('unknown')
    expect(confidence.ratio).toBe(0)
  })
})

describe('meal markers on the chart', () => {
  it('marks an assumed meal so charts can draw it apart from a logged one', () => {
    const mealPoint = run().find((p) => p.eventType === 'meal')
    expect(mealPoint).toBeTruthy()
    expect(mealPoint!.eventProvenance).toBe('assumed')
  })

  it('marks a logged meal as logged', () => {
    const points = run({
      breakfast: [{ name: 'Oats', carbs: 80, calories: 400, logged_at: `${DATE}T07:00:00Z` }]
    })
    const mealPoint = points.find((p) => p.eventType === 'meal')

    expect(mealPoint).toBeTruthy()
    expect(mealPoint!.eventProvenance).toBe('logged')
  })

  it('leaves points without a meal marker unlabelled', () => {
    const quiet = run().find((p) => !p.eventType)
    expect(quiet?.eventProvenance).toBeUndefined()
  })
})
