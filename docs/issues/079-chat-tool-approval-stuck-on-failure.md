# 079 — Chat Tool Approval Stuck On Failure

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, chat`  
**Status:** Open

## Description

app/pages/chat.vue

## Steps to Reproduce

Approve tool call with failing network; button spins forever.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/components/chat/ChatToolApproval.vue`

## Suggested Fix

Catch in onToolApproval and reset submitting; show error toast.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
