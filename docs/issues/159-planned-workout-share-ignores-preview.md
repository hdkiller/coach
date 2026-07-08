# 159 — Planned Workout Share Ignores Preview

**Type:** Bug  
**Priority:** Medium  
**Area:** `planning, share`  
**Status:** Fixed

> **Fixed (2026-07-08):** Planned workout shares honor `accessMode` PREVIEW — structure, description, and coach instructions omitted.

## Description

PREVIEW mode ignored for planned workout shares.

## Steps to Reproduce

Full structure on preview token.

## Affected Files

- `server/api/share/[token].get.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
