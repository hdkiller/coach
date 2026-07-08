# 158 — Developer Get Leaks Webhook Secret

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Postponed

> **Postponed (2026-07-08):** OAuth developer portal secret handling deferred with other OAuth hardening. Changing retrieval behavior may break developer app webhook setup flows.

## Description

Developer GET returns webhook secret.

## Steps to Reproduce

Secret retrievable anytime.

## Affected Files

- `server/api/developer/apps/[id].get.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
