# 268 — COACHES_ONLY visibility still leaks member emails

**Priority:** High  
**Type:** Security / Privacy  
**Status:** Fixed  
**Area:** `coaching, teams, privacy`

## Summary

Two email leaks on team surfaces:

1. **Masked roster branch** — when `teamVisibility === 'COACHES_ONLY'` and `maskSensitiveData` is true, response still includes `email` in the athlete object.
2. **Team details** — `GET /api/coaching/teams/[id]` returns every member's email to any team member via `getTeamDetails`, regardless of each athlete's visibility preference.

## Steps to Reproduce

1. Athlete sets team visibility to COACHES_ONLY.
2. Another team athlete (non-staff) loads team roster or team details.
3. Response includes masked athlete's email address.

## Expected Behavior

- `COACHES_ONLY`: non-staff see name/image only; email omitted.
- Team details: emails only for self, or for staff viewing roster management — not blanket enumeration.

## Actual Behavior

```ts
// teamRepository.ts masked branch ~L213-221
athlete: { id, name, email, image, isMasked: true }

// getTeamDetails ~L64
user: { select: { id, name, email, image } }
```

## Affected Files

- `server/utils/repositories/teamRepository.ts` — `getTeamRoster`, `getTeamDetails`
- `server/api/coaching/teams/[id].get.ts`
- `server/api/coaching/teams/[id]/roster.get.ts`

## Suggested Fix

- Omit `email` from masked roster payload; use `email: null` or exclude field.
- Filter emails in `getTeamDetails` based on viewer role and each member's `teamVisibility`.
- Staff (OWNER/ADMIN/COACH) may still need email for invite management — scope explicitly.

## Acceptance Criteria

- [ ] Non-staff cannot enumerate teammate emails when visibility is COACHES_ONLY
- [ ] Staff/coach flows that need email still work
- [ ] Athlete can see their own email on team page
- [ ] Tests for staff vs athlete vs COACHES_ONLY member
