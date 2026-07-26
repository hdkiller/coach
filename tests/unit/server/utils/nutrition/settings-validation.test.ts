import { describe, expect, it } from 'vitest'
import {
  validateFuelStates,
  validateMealPattern
} from '../../../../../server/utils/nutrition/settings-validation'

const paths = (issues: { path: (string | number)[] }[]) => issues.map((i) => i.path.join('.'))

describe('validateMealPattern', () => {
  it('accepts a normal pattern', () => {
    expect(
      validateMealPattern([
        { name: 'Breakfast', time: '07:00' },
        { name: 'Lunch', time: '12:00' },
        { name: 'Dinner', time: '18:30' }
      ])
    ).toEqual([])
  })

  it('rejects duplicate names', () => {
    const issues = validateMealPattern([
      { name: 'Lunch', time: '12:00' },
      { name: 'Lunch', time: '15:00' }
    ])

    expect(paths(issues)).toEqual(['mealPattern.1.name'])
    expect(issues[0]?.message).toContain('duplicates meal 1')
  })

  it('rejects names that only differ by case or punctuation', () => {
    // These collapse to the same window key, which is what actually collides.
    expect(
      paths(
        validateMealPattern([
          { name: 'Post ride', time: '12:00' },
          { name: 'post-ride!', time: '15:00' }
        ])
      )
    ).toEqual(['mealPattern.1.name'])
  })

  it('rejects an empty name', () => {
    expect(paths(validateMealPattern([{ name: '   ', time: '12:00' }]))).toEqual([
      'mealPattern.0.name'
    ])
  })

  it.each([
    ['1200', 'no separator'],
    ['25:00', 'hour out of range'],
    ['12:99', 'minute out of range'],
    ['noon', 'not a time at all'],
    ['', 'missing']
  ])('rejects the time %s (%s)', (time) => {
    expect(paths(validateMealPattern([{ name: 'Lunch', time }]))).toEqual(['mealPattern.0.time'])
  })

  it('accepts seconds on a time', () => {
    expect(validateMealPattern([{ name: 'Lunch', time: '12:00:00' }])).toEqual([])
  })
})

describe('validateFuelStates', () => {
  const coherent = {
    fuelState1Trigger: 0.7,
    fuelState2Trigger: 0.85,
    fuelState1Min: 2.5,
    fuelState1Max: 4.0,
    fuelState2Min: 4.5,
    fuelState2Max: 6.5,
    fuelState3Min: 7.0,
    fuelState3Max: 10.0
  }

  it('accepts the defaults', () => {
    expect(validateFuelStates(coherent)).toEqual([])
    expect(validateFuelStates({})).toEqual([])
  })

  it('rejects inverted triggers that make fuel state 2 unreachable', () => {
    const issues = validateFuelStates({
      ...coherent,
      fuelState1Trigger: 0.9,
      fuelState2Trigger: 0.5
    })

    expect(paths(issues)).toEqual(['fuelState2Trigger'])
  })

  it('rejects equal triggers, which also leave no band for fuel state 2', () => {
    expect(paths(validateFuelStates({ ...coherent, fuelState2Trigger: 0.7 }))).toEqual([
      'fuelState2Trigger'
    ])
  })

  it('rejects a range whose minimum exceeds its maximum', () => {
    expect(paths(validateFuelStates({ ...coherent, fuelState1Min: 5.0 }))).toContain(
      'fuelState1Max'
    )
  })

  it('rejects a harder state prescribing fewer carbohydrates than an easier one', () => {
    // state3 entirely below state1: a hard day would get less than an easy day.
    const issues = validateFuelStates({ ...coherent, fuelState3Min: 1.0, fuelState3Max: 2.0 })

    expect(paths(issues)).toEqual(expect.arrayContaining(['fuelState3Min', 'fuelState3Max']))
  })

  it('allows adjacent ranges to overlap as long as they climb', () => {
    expect(validateFuelStates({ ...coherent, fuelState2Min: 3.5, fuelState1Max: 5.0 })).toEqual([])
  })

  it('allows two states to share the same range', () => {
    // Flat is not inverted: an athlete who wants easy and moderate days fuelled alike is coherent,
    // just unusual. Only a *decrease* is the error.
    expect(validateFuelStates({ ...coherent, fuelState2Min: 2.5, fuelState2Max: 4.0 })).toEqual([])
  })

  it('allows a range pinned to a single value', () => {
    expect(validateFuelStates({ ...coherent, fuelState1Min: 4.0, fuelState1Max: 4.0 })).toEqual([])
  })

  it('applies the model defaults to fields that are not set', () => {
    // A request that moves only fuelState1Trigger still has to be checked against the 0.85 the
    // model will use for fuelState2Trigger.
    expect(paths(validateFuelStates({ fuelState1Trigger: 0.95 }))).toEqual(['fuelState2Trigger'])
  })
})
