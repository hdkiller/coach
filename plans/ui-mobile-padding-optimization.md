# Plan: UI Mobile Padding Optimization

**Goal:** Resolve the "compounded padding" issue on mobile devices where nested container components (e.g., `UCard` inside `UModal`) drastically reduce usable content width.

## 1. Audit Phase (Identification)

Identify all instances of "Double Padding" patterns.
Priority targets found during initial research:

- [ ] `app/components/dashboard/DailyCheckinModal.vue` (High Impact: `UCard` inside `UModal` body)
- [ ] `app/pages/recommendations/[id].vue` (Medium Impact: `UCard` inside `UDashboardPanel` body with padding)
- [ ] `app/pages/workouts/index.vue` (Low Impact: `WorkoutSummary` cards inside padded panel)
- [ ] Review all files using `<UModal>` for similar patterns (approx 78 matches).

## 2. Refactoring Phase (Implementation)

### Strategy A: Remove Inner Padding (Preferred for Modals)

For `UCard` used inside `UModal`:

- Override `UCard` body padding to be minimal or zero on mobile, or remove `UCard` shell entirely if not needed.
- **Pattern:** `<UCard :ui="{ body: 'p-0 sm:p-6' }">`

### Strategy B: Remove Outer Padding (Preferred for Panels)

For `UDashboardPanel` content:

- Reduce the parent container's padding on mobile.
- **Pattern:** Change `<div class="p-3 sm:p-6">` to `<div class="p-0 sm:p-6">` or `<div class="p-2 sm:p-6">`.

### Task List

- [ ] Refactor `DailyCheckinModal.vue`:
  - Remove `UCard` wrapper around questions if possible, OR
  - Set `UCard` body padding to 0 on mobile: `:ui="{ body: 'p-3 sm:p-6' }"` (current is likely default p-4).
- [ ] Refactor `app/pages/recommendations/[id].vue`:
  - Adjust grid spacing or parent padding.
- [ ] Check `app/components/dashboard/RecommendationDetailModal.vue` (already good, verify mobile width).
- [ ] Check `app/layouts/admin.vue` (verify no regression in new implementation).

## 3. Standardization Phase (Prevention)

- [ ] Update `app.config.ts` (optional): Consider reducing default `UCard` padding on mobile globally if this is a systemic issue.
  - Current: `body: 'p-4 sm:p-6'`
  - Proposed: `body: 'p-3 sm:p-6'` (small adjustment) or keep as is and use manual overrides.
- [ ] Document the "Nested Card" anti-pattern in `docs/04-guides/frontend-patterns.md`.
- [ ] Add lint rule or strict guideline in `RULES.md`.
