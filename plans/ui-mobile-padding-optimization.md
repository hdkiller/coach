# Plan: UI Mobile Padding Optimization

**Goal:** Resolve the "compounded padding" issue on mobile devices where nested container components (e.g., `UCard` inside `UModal`) drastically reduce usable content width.

## 1. Audit Phase (Identification)

Identify all instances of "Double Padding" patterns.

Priority targets found during initial research:

- [x] `app/components/dashboard/DailyCheckinModal.vue` (High Impact: `UCard` inside `UModal` body)

- [x] `app/pages/recommendations/[id].vue` (Medium Impact: `UCard` inside `UDashboardPanel` body with padding)

- [x] `app/pages/workouts/index.vue` (Low Impact: `WorkoutSummary` cards inside padded panel)

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

- [x] Refactor `DailyCheckinModal.vue`:
  - Set `UCard` body padding to optimized values: `:ui="{ body: 'p-3 sm:p-6' }"`.

- [x] Refactor `app/pages/recommendations/[id].vue`:
  - Reduced parent padding to `p-2` on mobile and optimized `UCard` padding.

- [x] Refactor `WorkoutSummary.vue`:
  - Reduced card padding to `p-3` and adjusted grid gap.

- [x] Check `app/components/dashboard/RecommendationDetailModal.vue` (already good, verify mobile width).

- [x] Check `app/layouts/admin.vue` (verify no regression in new implementation).

## 3. Standardization Phase (Prevention)

- [ ] Update `app.config.ts` (optional): Consider reducing default `UCard` padding on mobile globally if this is a systemic issue.
  - Current: `body: 'p-4 sm:p-6'`
  - Proposed: `body: 'p-3 sm:p-6'` (small adjustment) or keep as is and use manual overrides.
- [ ] Document the "Nested Card" anti-pattern in `docs/04-guides/frontend-patterns.md`.
- [ ] Add lint rule or strict guideline in `RULES.md`.

## 4. Candidate Files for Review

The following files contain both `<UModal>` and `<UCard>`. They have been reviewed for nested padding issues:

- [x] `app/components/settings/ConnectedApps.vue` (No nesting)
- [x] `app/components/settings/DangerZone.vue` (No nesting)
- [x] `app/components/profile/GoalsSettings.vue` (No nesting)
- [x] `app/pages/settings/coaching.vue` (No nesting)
- [x] `app/pages/settings/developer.vue` (No nesting)
- [x] `app/pages/settings/authorized-apps.vue` (No nesting)
- [x] `app/pages/developer/index.vue` (No nesting)
- [x] `app/pages/developer/[id].vue` (No nesting)
- [x] `app/pages/plans/index.vue` (No nesting)
- [x] `app/pages/workouts/planned/[id].vue` (No nesting)
- [x] `app/pages/workouts/[id].vue` (No nesting)
- [x] `app/pages/admin/webhooks.vue` (No nesting)
- [x] `app/pages/recommendations/index.vue` (Uses `#content` slot pattern correctly - Good)
- [x] `app/pages/coaching.vue` (No nesting)
- [x] `app/pages/profile/goals.vue` (No nesting)
- [x] `app/pages/profile/athlete.vue` (No nesting)
- [x] `app/pages/plan.vue` (No nesting)
