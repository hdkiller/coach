# 097 — Onboarding Consent Api Bypass

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux, backend`  
**Status:** Fixed

> **Fixed (2026-07-08):** `POST /api/user/consent` requires `healthConsentAccepted: true` in the request body; onboarding sends the flag explicitly.

## Description

server/api/user/consent.post.ts

## Steps to Reproduce

POST /api/user/consent directly without health checkbox; onboarding middleware passes.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/onboarding.vue`

## Suggested Fix

Require explicit healthConsentAccepted in request body.

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
