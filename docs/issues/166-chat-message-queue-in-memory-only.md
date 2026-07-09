# 166 — Chat Message Queue In Memory Only

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai,chat`  
**Status:** Fixed

## Description

Outgoing message queue is in-memory; lost on page refresh.

## Steps to Reproduce

Refresh during multi-message queue drops pending sends.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
