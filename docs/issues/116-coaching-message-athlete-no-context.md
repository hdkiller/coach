# 116 — Coaching Message Athlete No Context

**Type:** UI  
**Priority:** Medium  
**Area:** `coaching, ai`  
**Status:** Fixed

## Summary

**Message** / **Message Athlete** on coaching athlete surfaces opens the coach's AI Chat with a prefilled prompt naming the athlete. It does **not** pass `athleteId` (or other structured context), and it is **not** a human DM/email to the athlete. Labeling implies messaging the person.

## Steps to Reproduce

1. Open Coaching → Athletes (or athlete detail).
2. Click Message on an athlete card / detail header.
3. Land on `/chat?initialMessage=...` with a generic discussion prompt only.

## Expected Behavior

- Chat opens with structured athlete context (e.g. `athleteId` query handled like other coach-scoped tools), **and/or**
- Button label/copy makes clear this is AI assist, not messaging the athlete.
- Ideally a separate human channel CTA (email / external) if product wants real messaging.

## Actual Behavior

`useCoachingMessageAthlete` only sets `initialMessage`; no `athleteId`. Athletes never receive a notification.

## Affected Files

- `app/composables/useCoachingMessageAthlete.ts`
- `app/pages/coaching/athletes/index.vue`
- `app/pages/coaching/athletes/[id]/index.vue`
- `content/documentation/1.athletes/27.working-with-a-coach.md` — already documents the AI-chat behavior

## Suggested Fix

Pass `athleteId` / context query params the chat layer understands; rename control if it remains AI-only (e.g. \"Ask AI about athlete\").

## Acceptance Criteria

- [ ] Coach AI chat receives identifiable athlete context when opened from coaching UI
- [ ] Labeling does not imply an in-app DM was sent to the athlete


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
