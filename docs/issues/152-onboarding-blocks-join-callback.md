# 152 — Onboarding Blocks Join Callback

**Type:** Bug  
**Priority:** High  
**Area:** `onboarding, coaching`  
**Status:** Fixed

> **Fixed (2026-07-08):** Whitelisted `/join` and `/join/*` routes in onboarding middleware so OAuth signup callbacks can complete invite acceptance.

## Description

Onboarding middleware blocks join accept after signup.

## Steps to Reproduce

Invite lost after OAuth signup.

## Affected Files

- `app/middleware/onboarding.global.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
