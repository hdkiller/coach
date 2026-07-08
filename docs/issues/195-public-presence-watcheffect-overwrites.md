# 195 — Public Presence Watcheffect Overwrites

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

Public presence watchEffect replaces local refs on any refresh wiping in-progress edits.

## Steps to Reproduce

Edit join page text; save coach section; join edits lost.

## Affected Files

- `app/components/profile/PublicPresenceSettings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
