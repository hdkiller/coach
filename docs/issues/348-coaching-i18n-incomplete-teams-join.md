# 348 — Coaching teams/groups/join/public pages still largely untranslated

**Priority:** Low
**Type:** i18n
**Status:** Partial
**Area:** `coaching, i18n`
**Related:** [201](./201-coaching-pages-no-i18n.md) (Fixed for thin key set)

## Summary

`app/i18n/*/coaching.json` covers overview/athletes/calendar/team titles (~60 keys). Large hardcoded English remains in teams detail, GroupManager, join page, public Start/Join components, and invite modal strings (including the incorrect "6 characters" help — 327).

## Suggested Fix

Extend coaching locale files; wire `tr()` / Tolgee keys for teams, groups, join, and public coach pages.

## Acceptance Criteria

- [ ] Primary coaching/team/join strings use i18n keys in EN + ES at minimum


## Resolution (2026-07-19)

Partial — see remaining notes in acceptance criteria / handoff.
