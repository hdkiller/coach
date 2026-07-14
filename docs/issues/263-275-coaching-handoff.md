# Task: Fix coaching pages issues 263–275

## Context

A systematic review of `/coaching` pages, components, and API routes found 13 open issues documented in `docs/issues/263-*.md` through `275-*.md`. Index and fix order: `docs/issues/app-review-issues.md` (section "Issues 263–275").

**None of these are fixed yet.** Read each issue file before implementing.

## Files created

| ID  | File                                                | Priority |
| --- | --------------------------------------------------- | -------- |
| 263 | `263-public-share-invite-single-use.md`             | Critical |
| 264 | `264-team-roster-enrichment-wrong-coach-id.md`      | High     |
| 265 | `265-group-delete-route-missing.md`                 | High     |
| 266 | `266-team-staff-cannot-access-roster-athletes.md`   | High     |
| 267 | `267-weak-invite-codes-no-rate-limit.md`            | High     |
| 268 | `268-coaches-only-masking-leaks-email.md`           | High     |
| 269 | `269-coaching-legacy-endpoints-skip-requireauth.md` | Medium   |
| 270 | `270-coach-calendar-panel-fetch-race.md`            | Medium   |
| 271 | `271-overview-compliance-server-timezone.md`        | Medium   |
| 272 | `272-adherence-100-with-zero-planned.md`            | Medium   |
| 273 | `273-team-invite-email-case-sensitive.md`           | Medium   |
| 274 | `274-coaching-calendar-unbounded-range.md`          | Medium   |
| 275 | `275-coaching-polish-bundle.md`                     | Low      |

## Fix order (do in this sequence)

### PR 1 — Silent user-facing failures (highest value)

1. **263** — Public share invites single-use
   - `acceptAthleteInviteForCoach` and `teamRepository.acceptInvite` must NOT set `ACCEPTED` for public invites (`email IS NULL`). Keep `PENDING` until expiry/revoke.
   - Email-restricted invites stay single-use.
   - Verify branded join page (`server/api/public/coaches/[slug]/join.get.ts`) stays active after multiple accepts.
   - Add tests: two users accept same public coach + team invite.

2. **264** — Team roster enrichment wrong ID
   - `getTeamRoster` passes `m.teamId` to `getEnrichedAthleteForCoach` — should pass **viewing coach ID** from session.
   - Only enrich when direct coaching relationship exists; don't fake zero stats.

3. **265** — Missing group DELETE route
   - Add `server/api/coaching/groups/[id].delete.ts` (auth: group owner or team staff).
   - Wire `teamRepository.deleteGroup`. Optional: `[id].patch.ts` for rename.

4. **272** — Adherence 100% with zero planned
   - Return `null` instead of `100` when `recentPlanned === 0` in `coachingRepository`.
   - Update AthleteCard/UI to show `--` for null.

### PR 2 — AuthZ + security

5. **266** — Team staff 403 on roster View
   - **Decide product behavior first** (ask if unclear):
     - **Option A:** Extend `requireCoachAccessToAthlete` (or new helper) to allow team staff read access for same-team athletes.
     - **Option B:** Hide View links when viewer doesn't directly coach athlete (`canViewDetails` from roster API).
   - Align `teams/[id].vue` roster + calendar paths with chosen model.

6. **267** — Weak invite codes + no rate limit
   - Replace `Math.random()` with `crypto.randomBytes` helper; retry on unique collision.
   - Rate-limit `/api/join/[code].post` and `/api/coaching/athletes/connect.post`.

7. **268** — COACHES_ONLY email leak
   - Omit email from masked roster branch in `teamRepository.getTeamRoster`.
   - Filter emails in `getTeamDetails` based on viewer role + member `teamVisibility`.

8. **269** — Legacy endpoints skip `requireAuth`
   - Migrate `invite.get/post`, `athletes/connect.post`, `coaches/[id].delete` to `requireAuth`.
   - Delete coach returns 404 when relationship missing.

9. **273** — Team invite email case-sensitive (one-liner in `acceptInvite`).

### PR 3 — Correctness + bounds

10. **270** — Calendar fetch race: monotonic token or AbortController in `calendar.vue` `fetchPanel`.
11. **271** — Overview timezone: use coach/athlete TZ for week grid in `overview.get.ts`.
12. **274** — Calendar range validation: `start <= end`, max span cap in `calendar.get.ts`.

### PR 4 — Polish (optional / opportunistic)

13. **275** — Bundle: approve double-click, JSON.parse try/catch, team delete 404 ordering, dead code cleanup.
14. **116** — Message athlete context (separate existing issue; pass `athleteId` to `/chat`).

## Key files

- `server/utils/repositories/coachingRepository.ts`
- `server/utils/repositories/teamRepository.ts`
- `server/utils/coaching-auth.ts`
- `server/api/coaching/groups/` (add `[id].delete.ts`)
- `server/api/coaching/teams/[id]/roster.get.ts`
- `server/api/join/[code].post.ts`
- `app/pages/coaching/calendar.vue`
- `app/components/coaching/GroupManager.vue`

## Constraints

- Minimize scope — focused diffs per issue; match existing patterns.
- Add unit tests for 263, 264, 267, 273, 274 where practical.
- Do NOT commit unless asked.
- For 266: if authZ model is ambiguous, implement Option B (hide links) as safe default and note Option A in PR description.

## Verification

- [ ] Public coach share link: 2 athletes join successfully
- [ ] Team roster shows real metrics for directly-coached athletes
- [ ] Group delete works from Manage Groups modal
- [ ] No email in COACHES_ONLY masked responses for non-staff
- [ ] Rapid calendar week nav shows correct week
- [ ] Zero-plan athlete shows `--` not 100% adherence
