# 116 — Coaching Message Athlete No Context

**Type:** UI  
**Priority:** Medium  
**Area:** `coaching, ai`  
**Status:** Open

## Description

app/pages/coaching/athletes/index.vue

## Steps to Reproduce

Click message on athlete card; lands on generic /chat.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/coaching/athletes/[id]/index.vue`

## Suggested Fix

Pass athleteId/initialMessage query params like nutrition detail does.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
