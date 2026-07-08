# 070 — Yazio Password Plaintext Storage

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Open

## Description

server/api/integrations/yazio/connect.post.ts

## Steps to Reproduce

Connect Yazio integration; inspect integration row — password in refreshToken column.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Encrypt credentials or use secure vault; never store password in token fields.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
