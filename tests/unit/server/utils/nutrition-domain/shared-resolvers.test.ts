import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  calculateEnergyTimeline,
  calculateGlycogenState,
  resolveSimulationStartTime,
  resolveStartingGlycogenPercentage,
  resolveWorkoutDurationMin,
  resolveWorkoutIntensity
} from '../../../../../server/utils/nutrition-domain/metabolic-simulation'

const TIMEZONE = 'UTC'
const DATE = '2026-07-22'

const settings = {
  weight: 80,
  bmr: 1,
  metabolicFloor: 0.6,
  fuelState1Min: 2.5,
  mealPattern: [{ name: 'Breakfast', time: '07:00' }]
}

describe('resolveWorkoutDurationMin', () => {
  it('prefers durationSec, the canonical field on both workout models', () => {
    // Before the fix, `calculateGlycogenState` checked `duration` first and `calculateEnergyTimeline`
    // checked `durationSec` first, so a workout carrying both disagreed on its own length depending
    // on which calculator read it.
    const workout = { durationSec: 3600, duration: 7200, plannedDuration: 10800 }
    expect(resolveWorkoutDurationMin(workout)).toBe(60)
  })

  it('falls back through duration and plannedDuration in order', () => {
    expect(resolveWorkoutDurationMin({ duration: 1800 })).toBe(30)
    expect(resolveWorkoutDurationMin({ plannedDuration: 900 })).toBe(15)
  })

  it('defaults to one hour when nothing is set', () => {
    expect(resolveWorkoutDurationMin({})).toBe(60)
  })
})

describe('resolveWorkoutIntensity', () => {
  it('prefers workIntensity, the canonical field on PlannedWorkout', () => {
    // Before the fix, `calculateGlycogenState` checked `intensity` first while
    // `calculateEnergyTimeline` checked `workIntensity` first, so the two disagreed whenever both
    // fields were present.
    const workout = { workIntensity: 0.9, intensityFactor: 0.6, intensity: 0.3 }
    expect(resolveWorkoutIntensity(workout)).toBe(0.9)
  })

  it('falls back through intensityFactor and intensity in order', () => {
    expect(resolveWorkoutIntensity({ intensityFactor: 0.55 })).toBe(0.55)
    expect(resolveWorkoutIntensity({ intensity: 0.72 })).toBe(0.72)
  })

  it('defaults to 0.7 when nothing is set', () => {
    expect(resolveWorkoutIntensity({})).toBe(0.7)
  })
})

describe('resolveStartingGlycogenPercentage', () => {
  it('uses an explicit value as-is, including an honest zero', () => {
    expect(resolveStartingGlycogenPercentage(0, 0.6)).toBe(0)
    expect(resolveStartingGlycogenPercentage(42, 0.6)).toBe(42)
  })

  it('floors a negative explicit value at 0 rather than going below empty', () => {
    expect(resolveStartingGlycogenPercentage(-15, 0.6)).toBe(0)
  })

  it('falls back to the metabolic floor when no value is supplied', () => {
    expect(resolveStartingGlycogenPercentage(undefined, 0.6)).toBe(60)
  })

  it('falls back to the metabolic floor for a non-finite value instead of propagating NaN', () => {
    // `calculateGlycogenState` used to accept any non-undefined value verbatim, so a NaN starting
    // percentage silently poisoned every downstream calculation instead of falling back like
    // `calculateEnergyTimeline` already did.
    expect(resolveStartingGlycogenPercentage(NaN, 0.6)).toBe(60)
  })
})

describe('resolveSimulationStartTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the calendar day straight off a Date without reinterpreting it through the timezone', () => {
    // Nutrition/workout `date` columns are `@db.Date` and arrive as a UTC-midnight instant that
    // already encodes the intended calendar day - reinterpreting that instant through a non-UTC
    // timezone would shift the day key by one.
    const { dateStr } = resolveSimulationStartTime(
      new Date('2026-07-22T00:00:00.000Z'),
      'America/New_York'
    )
    expect(dateStr).toBe('2026-07-22')
  })

  it("anchors the no-date fallback to the caller's timezone, not the server's UTC clock", () => {
    // Previously this fallback read `new Date().toISOString()`, i.e. the UTC calendar day, even
    // though a timezone was available and used everywhere else in the same calculation.
    vi.useFakeTimers()
    // 23:30 UTC on the 21st is already the 22nd in a UTC+2 zone.
    vi.setSystemTime(new Date('2026-07-21T23:30:00.000Z'))

    const { dateStr } = resolveSimulationStartTime(undefined, 'Europe/Berlin')
    expect(dateStr).toBe('2026-07-22')
  })
})

describe('calculateGlycogenState and calculateEnergyTimeline agree on workout field resolution', () => {
  it('drain the same share of capacity for a workout carrying conflicting duration/intensity fields', () => {
    // A workout object populated the way merged completed+planned records sometimes are: several
    // duration/intensity fields set to different values. Before the shared resolvers, the two
    // calculators picked different fields and so disagreed on how much this session cost.
    const workout = {
      id: 'w1',
      title: 'Conflicting Fields Ride',
      type: 'Ride',
      source: 'planned',
      date: new Date(`${DATE}T00:00:00Z`),
      startTime: new Date(`${DATE}T09:00:00Z`),
      durationSec: 3600,
      duration: 7200,
      plannedDuration: 10800,
      workIntensity: 0.8,
      intensityFactor: 0.5,
      intensity: 0.3
    }

    // A zero-carb logged breakfast counts as a real (if empty) log, so neither calculator synthesizes
    // an assumed meal on top of it - the only thing moving the tank in this scenario is the workout.
    const nutritionRecord = {
      date: DATE,
      carbsGoal: 500,
      breakfast: [{ name: 'Water', carbs: 0, calories: 0, logged_at: `${DATE}T07:00:00Z` }],
      lunch: [],
      dinner: [],
      snacks: []
    }

    const state = calculateGlycogenState(
      nutritionRecord,
      [workout],
      settings,
      TIMEZONE,
      new Date(`${DATE}T11:00:00Z`),
      80
    )

    const points = calculateEnergyTimeline(
      nutritionRecord,
      [workout],
      settings,
      TIMEZONE,
      undefined,
      {
        startingGlycogenPercentage: 80,
        startingFluidDeficit: 0,
        now: new Date(`${DATE}T11:00:00Z`)
      }
    )

    const timelinePoint = points.find((p) => p.time === '11:00')!

    // Both calculators resolved `durationSec: 3600` (1 hour, fully elapsed by 11:00) and
    // `workIntensity: 0.8`, so they should land on the same tank level within rounding.
    expect(Math.abs(state.percentage - timelinePoint.level)).toBeLessThanOrEqual(1)
  })
})
