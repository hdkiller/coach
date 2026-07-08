# 151 — User Profile Stale On Error

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux, profile`  
**Status:** Fixed

## Description

fetchProfile keeps stale data on error.

## Steps to Reproduce

Expired session shows old profile.

## Affected Files

- `app/stores/user.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
