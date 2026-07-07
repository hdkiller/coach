# 011 — Final validation ignores `blocks`-only strength structures

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Strength workouts are instructed to use a canonical `blocks` schema, but final pre-persist validation only checks `steps` and `exercises` arrays for presence and duration/TSS. A structure with valid `blocks` but empty `steps`/`exercises` may bypass guards or fail coverage validation incorrectly.

## Evidence

**Prompt instructs blocks:**

```1116:1127:trigger/generate-structured-workout.ts
    - Prefer the canonical strength schema: provide 'blocks' instead of a flat 'exercises' list.
    - CRITICAL: Return native 'blocks' for strength. Do NOT return interval-style top-level 'steps' for WeightTraining.
```

**Final validation only checks steps/exercises:**

```1708:1715:trigger/generate-structured-workout.ts
    const hasSteps = Array.isArray(structure.steps) && structure.steps.length > 0
    const hasExercises = Array.isArray(structure.exercises) && structure.exercises.length > 0
```

**Coverage validation uses steps only:**

```1411:1420:trigger/generate-structured-workout.ts
      totals = normalizeAndCalculate(structure.steps || [])
      ...
      const coverageValidation = validateStructuredCoverage({
        ...
        steps: structure.steps || [],
```

Strength-specific validation (`validateStrengthStructuredWorkout`) runs inside the retry loop but the final empty-structure guard does not consider `blocks`.

## Impact

- Inconsistent validation between strength and endurance workouts.
- May contribute to zero-step WeightTraining records in production (support data shows WeightTraining as top zero-step type on affected accounts).

## Suggested Fix

1. Extend renderable-structure check to include `blocks` with nested exercise steps.
2. Include block duration in coverage totals for strength types.
3. Share logic with frontend preview guards (`CalendarDayCell`, mini charts).

## Acceptance Criteria

- [ ] Strength structures with blocks-only pass validation when blocks are non-empty
- [ ] Empty blocks fail the same way as empty steps
- [ ] Coverage validation accounts for strength block duration
