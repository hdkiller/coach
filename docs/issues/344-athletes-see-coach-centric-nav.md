# 344 — Pure athletes see coach-centric Coaching navigation

**Priority:** Medium
**Type:** UX / IA
**Status:** Partial
**Area:** `coaching, navigation`

## Summary

Sidebar Coaching children (Overview, Calendar, Athletes, Analytics, Team) are shown to all users. Athletes who only want a coach hit coach empty states ("Connect Your First Athlete") instead of a My Coaches–first entry.

## Evidence

- `app/layouts/default.vue` — coaching nav always listed
- Empty states on `/coaching` and `/coaching/athletes` are coach-oriented

## Suggested Fix

Role-aware nav (athlete: My Coaches + join paths; coach: full suite), or land athletes on `/coaching/team` (or a dedicated coaches page) by default.

## Acceptance Criteria

- [ ] Athlete without a roster is not dumped into coach empty states as the primary path


## Resolution (2026-07-19)

Partial — see remaining notes in acceptance criteria / handoff.
