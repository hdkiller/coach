# 045 — Wellness modal has incorrect dialog title for screen readers

**Type:** UI (Accessibility)  
**Priority:** Low  
**Area:** `wellness`, `ui/ux`  
**Status:** Open

## Description

The root `UModal` uses `title="Dialog"` while the visible header says “Wellness Overview”. Screen readers announce a meaningless dialog name.

## Root Cause

```2:2:app/components/WellnessModal.vue
  <UModal v-model:open="isOpen" class="sm:max-w-2xl" title="Dialog">
```

## Steps to Reproduce

1. Open wellness modal.
2. Inspect accessible name (screen reader or devtools).
3. Announced as “Dialog” instead of “Wellness Overview”.

## Expected Behavior

- Modal accessible name matches visible title.

## Actual Behavior

- Generic “Dialog” title for assistive technology.

## Affected Files

- `app/components/WellnessModal.vue`

## Suggested Fix

Set `title` to a translated “Wellness Overview” string (or use `aria-labelledby` pointing at the visible header).

## Acceptance Criteria

- [ ] Screen reader announces meaningful modal title
- [ ] Title is i18n-ready
