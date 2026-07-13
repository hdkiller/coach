# 234 — Outgoing Chat Queue Survives Identity Switch

**Type:** Bug  
**Priority:** Low  
**Area:** `chat`  
**Status:** Fixed

## Description

SessionStorage-backed outgoing message queue survives logout/login in the same tab and auto-dispatches when a room becomes current.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- Queue cleared on logout and identity switch.
- Queued messages cannot fire under a different user session.
