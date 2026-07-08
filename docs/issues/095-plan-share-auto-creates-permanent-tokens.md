# 095 — Plan Share Auto Creates Permanent Tokens

**Type:** Bug  
**Priority:** Medium  
**Area:** `planning, integrations`  
**Status:** Fixed

> **Fixed (2026-07-08):** Removed GET side-effect token creation for plan shares; only attaches existing planned-workout tokens.

## Description

server/api/share/[token].get.ts

## Steps to Reproduce

View shared plan once; permanent planned-workout tokens created for all workouts in plan.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Avoid GET side effects; pre-create tokens with expiration or lazy-create on explicit share.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
