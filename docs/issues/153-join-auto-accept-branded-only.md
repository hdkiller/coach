# 153 — Join Auto Accept Branded Only

**Type:** Bug  
**Priority:** Medium  
**Area:** `coaching, ui/ux`  
**Status:** Fixed

> **Fixed (2026-07-08):** Auto-accept with `?accept=1` now runs for all invite types once the invite is loaded, not only branded athlete invites.

## Description

Auto-accept only for branded athlete invites.

## Steps to Reproduce

Team invite needs manual accept.

## Affected Files

- `app/pages/join/[code].vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
