# 096 — Join Invite Preview Exposes Pii

**Type:** Bug  
**Priority:** Medium  
**Area:** `coaching, backend`  
**Status:** Fixed

> **Fixed (2026-07-08):** Omitted reserved `email` from ATHLETE_INVITE public preview in `join/[code].get.ts`.

## Description

server/api/join/[code].get.ts

## Steps to Reproduce

Guess or obtain invite code; response includes reserved email address.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Require auth for sensitive fields or rate-limit and minimize PII in preview.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
