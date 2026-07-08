# 165 — Chat Queued Messages Lost On Error

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai,chat`  
**Status:** Open

## Description

Failed queued chat sends are removed from queue not retried.

## Steps to Reproduce

Network blip during queued send loses message.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
