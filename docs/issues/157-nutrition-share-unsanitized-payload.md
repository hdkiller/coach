# 157 — Nutrition Share Unsanitized Payload

**Type:** Bug  
**Priority:** High  
**Area:** `nutrition, share`  
**Status:** Fixed

> **Fixed (2026-07-08):** Sanitized nutrition share payload via `sanitizeSharedNutrition()` — strips `userId`, `rawJson`, and internal chain fields.

## Description

Nutrition share returns full internal record.

## Steps to Reproduce

userId and rawJson exposed.

## Affected Files

- `server/api/share/[token].get.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
