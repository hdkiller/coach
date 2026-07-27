import { describe, expect, it } from 'vitest'
import { normalizeWindowLabel } from '../../../../app/utils/nutrition-window-label'

describe('normalizeWindowLabel', () => {
  it('prefers the configured slot name over a disagreeing derived label', () => {
    // The production case: a 15:00 slot the athlete named "Snack" was stored with label "Lunch",
    // so the day rendered a 12:00 "Lunch" and a 15:00 "Lunch".
    expect(normalizeWindowLabel({ type: 'DAILY_BASE', slotName: 'Snack', label: 'Lunch' })).toBe(
      'Snack'
    )
  })

  it('keeps every baseline slot of a day distinct', () => {
    const windows = [
      { type: 'DAILY_BASE', slotName: 'Breakfast', label: 'Breakfast' },
      { type: 'DAILY_BASE', slotName: 'Lunch', label: 'Lunch' },
      { type: 'DAILY_BASE', slotName: 'Snack', label: 'Lunch' },
      { type: 'DAILY_BASE', slotName: 'Dinner', label: 'Dinner' }
    ]

    const labels = windows.map(normalizeWindowLabel)
    expect(labels).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner'])
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('honours a custom slot name', () => {
    expect(
      normalizeWindowLabel({ type: 'DAILY_BASE', slotName: 'Elevenses', label: 'Lunch' })
    ).toBe('Elevenses')
  })

  it('keeps the richer derived label on workout windows', () => {
    expect(normalizeWindowLabel({ type: 'PRE_WORKOUT', label: 'Pre-Workout Breakfast' })).toBe(
      'Pre-Workout Breakfast'
    )
    expect(normalizeWindowLabel({ type: 'INTRA_WORKOUT', label: 'Intra-Workout Fueling' })).toBe(
      'Intra-Workout Fueling'
    )
  })

  it('does not let a slot name strip the workout context from the label', () => {
    // buildWindowLabel composes `Pre-Workout ${slotName}`, so a workout window that also carries a
    // slot name must still show the composed label - preferring slotName everywhere would render
    // this as a bare "Breakfast" and lose which session it serves.
    expect(
      normalizeWindowLabel({
        type: 'PRE_WORKOUT',
        slotName: 'Breakfast',
        label: 'Pre-Workout Breakfast'
      })
    ).toBe('Pre-Workout Breakfast')
  })

  it('falls back to the label when a baseline window has no slot name', () => {
    expect(normalizeWindowLabel({ type: 'DAILY_BASE', label: 'Lunch' })).toBe('Lunch')
  })

  it('falls back to the type when it has neither', () => {
    // Underscores become spaces; the existing casing rule only upper-cases word starts, so an
    // already-upper type stays upper. Unchanged behaviour, pinned so it stays that way.
    expect(normalizeWindowLabel({ type: 'POST_WORKOUT' })).toBe('POST WORKOUT')
    expect(normalizeWindowLabel({})).toBe('Window')
  })

  it('title-cases a lowercase custom name', () => {
    expect(normalizeWindowLabel({ type: 'DAILY_BASE', slotName: 'post ride' })).toBe('Post Ride')
  })
})
