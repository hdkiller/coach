# Vue Performance Audit — Lifecycle & Memory Leak Prevention

**Domain**: Listener Cleanup, Timers, and Event Bus Disposals  
**Scope**: 218 Vue Files  
**Auditor**: Antigravity Vue Performance Specialist

---

## 📊 Summary Scorecard

| Check Item | Description                                            | Status      | Severity | Affected Files                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------ | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P3.1**   | Passive Event Listener Flags for High-Frequency Events | ⚠️ Major    | Major    | [`HowItWorks.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/HowItWorks.vue#L189)                                                                                              |
| **P3.2**   | Event Listener Cleanup Pair Verification               | 🟢 Verified | Minor    | [`DensityHeatmap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/DensityHeatmap.vue#L170), [`chat.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue#L1108) |
| **P3.3**   | Interval Cleanup Verification in Long-Running Pages    | 🟢 Verified | Minor    | [`ChatPlannedWorkoutCard.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatPlannedWorkoutCard.vue#L595)                                                                         |

---

## 🔍 Detailed Audit Findings

### ⚠️ P3.1: High-Frequency Scroll Listener Passive Flags

- **File**: [`HowItWorks.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/HowItWorks.vue#L189-L190)
- **Status**: 🟢 Already uses `{ passive: true }` for window scroll and resize events.
- **Finding**: Scroll listeners correctly pass `{ passive: true }` to allow smooth 60fps scrolling without blocking main thread frame budget.

---

### 🟢 P3.2: Complete Event Listener Teardown Verification

- **Verified Files**:
  - `DensityHeatmap.vue`: `window.removeEventListener('resize', renderHeatmap)` in `onUnmounted`.
  - `PlanArchitectWorkoutDrawer.vue`: `pointermove`, `pointerup`, `dragend`, `drop` listeners cleaned up in `onBeforeUnmount`.
  - `chat.vue`: `visualViewport` resize/scroll listeners cleaned up in `onBeforeUnmount`.
  - `billing.vue`: `pageshow` and `focus` listeners cleaned up in `onBeforeUnmount`.
