# 260 — Strength export validation exemption is dead code

**Priority:** High  
**Type:** Bug  
**Status:** Open

## Summary

`validateCanonicalForDestination()` includes a strength-specific condition intended to avoid step-level export issues when native strength structures are present (e.g. `blocks`/`exercises`). As currently written, it returns the same value on both branches and therefore has **no effect**.

This becomes user-visible when a strength workout structure contains both:

- native `blocks` (the intended source of truth), and
- a leftover `steps` array (often from normalization or mixed AI output).

In that hybrid case, export validation surfaces step-level target issues (e.g. rejected `power`) and incorrectly blocks export.

## Impact

- False `export_blocked` outcomes on strength workouts with valid `blocks`.

## Likely fix

- If `sport === 'strength'` and native strength structure exists (`blocks`/`exercises`), either:
  - skip visiting `steps`, or
  - ignore step-derived target issues (return `[]` / filter).

## References

- `shared/workout-support-matrix.ts` — `validateCanonicalForDestination()` strength branch returns `issues` in both branches
