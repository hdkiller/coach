import { describe, expect, it } from 'vitest'
import { isMutatingChatTool } from './turns'

describe('isMutatingChatTool', () => {
  it('classifies structure write tools as mutating', () => {
    expect(isMutatingChatTool('set_planned_workout_structure')).toBe(true)
    expect(isMutatingChatTool('modify_training_plan_structure')).toBe(true)
    expect(isMutatingChatTool('generate_planned_workout_structure')).toBe(true)
    expect(isMutatingChatTool('adjust_planned_workout')).toBe(true)
  })

  it('keeps existing mutating tools classified as mutating', () => {
    expect(isMutatingChatTool('create_planned_workout')).toBe(true)
    expect(isMutatingChatTool('log_nutrition_meal')).toBe(true)
    expect(isMutatingChatTool('log_hydration_intake')).toBe(true)
    expect(isMutatingChatTool('lock_meal_to_plan')).toBe(true)
    expect(isMutatingChatTool('record_wellness_event')).toBe(true)
    expect(isMutatingChatTool('ticket_update')).toBe(true)
    expect(isMutatingChatTool('patch_planned_workout_structure')).toBe(true)
  })

  it('does not classify read tools as mutating', () => {
    expect(isMutatingChatTool('get_workout_details')).toBe(false)
    expect(isMutatingChatTool('get_recent_workouts')).toBe(false)
  })
})
