# 077 — Chat Load Errors Empty State

**Type:** UI  
**Priority:** Medium  
**Area:** `ai, chat`  
**Status:** Open

## Description

app/pages/chat.vue

## Steps to Reproduce

Block /api/chat/* requests; open /chat — empty state, no error banner.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Render error UI with retry for loadRooms/loadMessages failures.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
