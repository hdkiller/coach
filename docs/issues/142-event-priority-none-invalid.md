# 142 — Event Priority None Invalid

**Type:** Bug  
**Priority:** Medium  
**Area:** `planning, events`  
**Status:** Open

## Description

Priority NONE invalid in API schema.

## Steps to Reproduce

Save with None priority; 400.

## Affected Files

- `app/components/events/EventForm.vue`
- `server/api/events/index.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
