# 070 — Yazio Password Plaintext Storage

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Postponed

> **Postponed (2026-07-08):** Current Yazio credential storage in integration token fields is accepted for now. Revisit when a vault/encryption approach is planned without disrupting Yazio ingest.

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
