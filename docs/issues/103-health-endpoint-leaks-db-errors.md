# 103 — Health Endpoint Leaks Db Errors

**Type:** Bug  
**Priority:** Medium  
**Area:** `infra, backend`  
**Status:** Open

## Description

server/api/health.get.ts

## Steps to Reproduce

Break DB connection; GET /api/health returns error field with driver message.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Return generic 'database unavailable'; log details server-side only.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
