# 102 — Monitoring Trigger Public Without Secret

**Type:** Bug  
**Priority:** High  
**Area:** `infra, backend`  
**Status:** Open

## Description

server/api/monitoring/trigger.get.ts

## Steps to Reproduce

Call /api/monitoring/trigger without auth when MONITORING_SECRET unset.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Require auth always or fail closed when secret unset in production.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
