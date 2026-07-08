# 109 — Deactivated Users Pass Client Middleware

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux, backend`  
**Status:** Open

## Description

server/api/auth/[...].ts

## Steps to Reproduce

Deactivate account; session may still show authenticated pages with stale client state.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Check deactivatedAt in middleware; force logout.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
