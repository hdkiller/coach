# 094 — Share Generate Workout Read All Types

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/share/generate.post.ts

## Steps to Reproduce

OAuth client with workout:read only can mint wellness/chat share links.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Scope-check per resourceType.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
