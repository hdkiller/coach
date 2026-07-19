# 266 — Team staff get 403 opening roster athletes they don't personally coach

**Priority:** High  
**Type:** Bug / AuthZ  
**Status:** Fixed (Option B — hide View; multi-coach shared access still a product gap — see 347)  
**Area:** `coaching, teams, auth`

## Summary

Team roster "View" routes to `/coaching/athletes/{id}`, but athlete detail, calendar, and planned-workout APIs use `requireCoachAccessToAthlete`, which only checks a **direct** `coachingRelationship`. Team OWNER/ADMIN/COACH who did not personally connect an athlete get a 403 error page — including on team calendar paths.

## Steps to Reproduce

1. Team has Coach A and Coach B (staff). Athlete is on team roster, coached only by Coach A.
2. Coach B opens team roster → clicks View on that athlete.
3. 403: "You do not have permission to access this athlete."

## Expected Behavior

Choose one product path (document in fix):

- **A)** Team staff with roster access can view athlete coaching pages (read-only or full per role).
- **B)** Hide View / calendar links for athletes the viewer doesn't directly coach.

## Actual Behavior

- `requireCoachAccessToAthlete` — only `coachingRepository.checkRelationship(coach.id, athleteId)`.
- No `checkTeamAccess` fallback for shared team athletes.

## Affected Files

- `server/utils/coaching-auth.ts` — `requireCoachAccessToAthlete`
- `server/api/coaching/athletes/[id]/*` — calendar, planned-workouts, workouts
- `app/pages/coaching/teams/[id].vue` — roster View links
- `app/pages/coaching/calendar.vue` — team athlete selection

## Suggested Fix

**If A (team staff access):**

- Extend `requireCoachAccessToAthlete` (or add `requireCoachOrTeamStaffAccess`) to allow access when both users are active members of the same team and caller has staff role.
- Scope write endpoints separately — staff read vs coach write.

**If B (hide links):**

- Roster API returns `canViewDetails: boolean` per member.
- UI disables/hides View for non-coached athletes.

## Acceptance Criteria

- [ ] Team staff behavior is consistent between roster UI and API auth
- [ ] No 403 surprise when UI advertises View
- [ ] Direct-coach-only athletes still protected from unrelated coaches
- [ ] Tests cover staff-on-same-team vs staff-on-different-team
