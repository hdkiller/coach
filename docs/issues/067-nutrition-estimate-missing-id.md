# 067 — Estimate-only nutrition days break notes, logging, and analyze

**Type:** Bug  
**Priority:** High  
**Area:** `nutrition`, `backend`, `ui/ux`  
**Status:** Fixed

## Description

For a date with no DB row, the API returns an in-memory estimate object **without** `id`. The detail page still renders NotesEditor, food modals, and analyze using `nutrition.id`, producing broken endpoints like `/api/nutrition/undefined/notes`.

## Root Cause

```113:127:server/api/nutrition/[id].get.ts
      if (!nutrition) {
        nutrition = {
          date: dateObj,
          ...
          isEstimate: true
        }
      }
```

Detail page uses `nutrition.id` for mutations without checking `isEstimate`.

## Steps to Reproduce

1. Navigate to `/nutrition/YYYY-MM-DD` for a date with no logged nutrition.
2. Page loads with fueling estimate UI.
3. Try Refresh analysis, add food, or save notes — requests fail (undefined id).

## Expected Behavior

- Estimate-only days disable mutations or auto-create a nutrition row on first edit.

## Actual Behavior

- Interactive controls call APIs with undefined id.

## Affected Files

- `server/api/nutrition/[id].get.ts`
- `app/pages/nutrition/[id].vue`

## Suggested Fix

Persist stub row on first access, or gate UI actions when `isEstimate` / no `id`.

## Acceptance Criteria

- [x] Notes/food/analyze work on estimate days or are clearly disabled
- [x] No `/api/nutrition/undefined/*` requests
