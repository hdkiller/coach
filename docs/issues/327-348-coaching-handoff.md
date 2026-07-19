# Task: Coaching invites & relationship UX — issues 327–348

## Context

2026-07-19 deep pass over human coaching (athlete↔coach invites, My Coaches, team staff, public Start/Join). Prior batch **263–275** mostly **Fixed in code** (tracker updated); leftovers **272 Partial**, **275 Open**, **116 Open**.

Index: [app-review-issues.md](./app-review-issues.md) § Issues 327–348.

## Critical (fix first)

| ID  | File                                                         | Notes                                      |
| --- | ------------------------------------------------------------ | ------------------------------------------ |
| 327 | `327-connect-by-code-maxlength-six.md`                       | Connect modal `maxlength=6` vs 10-char codes |
| 328 | `328-share-invite-link-points-to-start.md`                   | Share InviteLink → `/start` not `/join`    |

## High

| ID  | File                                                    |
| --- | ------------------------------------------------------- |
| 329 | `329-act-as-ui-missing.md`                              |
| 330 | `330-coach-cannot-remove-athlete.md`                    |
| 331 | `331-coaching-team-page-ia-confusion.md`                |
| 332 | `332-branded-coach-join-page-missing.md`                |
| 333 | `333-team-invites-never-send-email.md`                  |
| 334 | `334-team-member-remove-role-change-missing.md`         |
| 335 | `335-group-details-email-leak.md`                       |

## Medium / Low

336–348 + continue **116** / **275**. See index for titles and suggested fix order.

## Fix order

1. **327 + 328** — invite redemption
2. **335** — privacy
3. **332 + 333** — join/email honesty
4. **330 + 334** — offboarding
5. **331 + 344 + 343** — IA
6. Product decisions: **329 / 347 / 345**
7. Polish: **336–342**, **338–341**, **346**, **348**, **116**, **275**

## Constraints

- Documentation-only in the filing PR unless asked to implement.
- Prefer Option B-safe defaults for authZ until product chooses Option A (347).
- Dedup against 263–275 before reopening fixed items.


## Implementation status (2026-07-19)

Patched on `cursor/coaching-issues-review-7f31`:

- **Fixed:** 327–343, 347, 116, 272 (detail adherence)
- **Partial:** 344 (nav rename only), 348 (EN keys; ES thin)
- **Open / deferred:** 345 (nutrition product), 346 (SUSPENDED status model)
