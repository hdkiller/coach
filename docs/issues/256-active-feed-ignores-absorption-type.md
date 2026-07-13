# 256 — Active Feed Absorption Progress Ignores Stored `absorptionType`

**Type:** Bug  
**Priority:** Low  
**Area:** `nutrition` (active feed)  
**Status:** Open

## Description

`GET /api/nutrition/active-feed` computes each recent item's absorption progress with
`getProfileForItem(item.name)` — which, since keyword matching was removed, **always
returns BALANCED**. Logged items carry an explicit `absorptionType` (set by the AI
parser and manual entry), and `getMealTargetContext` in the same response chain already
resolves it correctly via `ABSORPTION_PROFILES[item.absorptionType]`. Result: a gel
shows ~0 % absorbed 20 minutes after logging (BALANCED has a 30-min delay) when it
should be nearly fully absorbed under RAPID.

## Affected Files

- `server/api/nutrition/active-feed.get.ts` (~line 102)

## Acceptance Criteria

- Absorption progress resolves the item's stored `absorptionType` first (falling back
  to BALANCED), matching `getMealTargetContext`'s resolver.
