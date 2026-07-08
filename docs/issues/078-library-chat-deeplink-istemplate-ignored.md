# 078 — Library Chat Deeplink Istemplate Ignored

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, workouts`  
**Status:** Open

## Description

app/pages/library/workouts/[id].vue

## Steps to Reproduce

Chat about library template; seeded message asks to analyze completed workout.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/chat.vue`

## Suggested Fix

Handle isTemplate query param in chat.vue deep link logic.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
