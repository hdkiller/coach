# 151 — User Profile Stale On Error

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux, profile`  
**Status:** Open

## Description

fetchProfile keeps stale data on error.

## Steps to Reproduce

Expired session shows old profile.

## Affected Files

- `app/stores/user.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
