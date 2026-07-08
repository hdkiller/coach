# 081 — Nutrition History Analyze Stuck Loading

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Fixed

## Description

app/pages/nutrition/history.vue

## Steps to Reproduce

Fail analyze-nutrition task; Analyze button stays loading.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add onTaskFailed handler.

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
