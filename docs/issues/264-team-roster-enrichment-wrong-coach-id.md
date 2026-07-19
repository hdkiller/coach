# 264 — Team roster enrichment passes `teamId` as `coachId`

**Priority:** High  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, teams, backend`

## Summary

`teamRepository.getTeamRoster` calls `coachingRepository.getEnrichedAthleteForCoach(m.teamId, m.user.id)`. Enrichment looks up `coachingRelationship` where `coachId = teamId`, which never matches. Every roster athlete falls back to the raw user row; CTL/TSB/adherence default to zeros.

Staff pay a pointless heavy query per member on every roster load.

## Steps to Reproduce

1. Coach with active team roster opens `/coaching/teams/[id]`.
2. Observe athlete cards: adherence/CTL/TSB show 0 or defaults despite real training data.
3. Compare same athlete on `/coaching/athletes` list (direct coaching) — metrics appear correctly.

## Expected Behavior

- Team roster shows enriched metrics when the viewing coach has a direct coaching relationship with the athlete.
- Or: team-scoped enrichment uses the **session coach's ID**, not the team ID.
- Athletes without a direct relationship with the viewer show masked or `--` per visibility rules.

## Actual Behavior

```ts
// teamRepository.ts ~L225
const athlete = await coachingRepository.getEnrichedAthleteForCoach(m.teamId, m.user.id)
```

`getEnrichedAthleteForCoach` queries `where: { coachId, athleteId }` — `coachId` is a team UUID, so lookup always fails.

## Affected Files

- `server/utils/repositories/teamRepository.ts` — `getTeamRoster` (~L207–243)
- `server/api/coaching/teams/[id]/roster.get.ts` — consumer
- `server/utils/repositories/coachingRepository.ts` — `getEnrichedAthleteForCoach`

## Suggested Fix

- Pass **viewing coach ID** (from API handler) into `getTeamRoster(coachId, teamId, options)`.
- Call `getEnrichedAthleteForCoach(viewingCoachId, m.user.id)` only when `checkRelationship(viewingCoachId, m.user.id)`.
- For team staff without direct relationship: return basic profile + `isMasked` or null stats (do not fake zeros).
- Consider a lighter team-roster stats path if full enrichment is too heavy for N members.

## Acceptance Criteria

- [ ] Team roster shows real adherence/CTL for athletes the viewing coach directly coaches
- [ ] No spurious all-zero stats when data exists for coached athletes
- [ ] Non-coached roster members do not show misleading 100% or zero compliance
- [ ] Roster API accepts and uses session coach ID for enrichment scope
