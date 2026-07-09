# 167 — Admin Impersonate Self Allowed

**Type:** Bug  
**Priority:** Medium  
**Area:** `admin,backend`  
**Status:** Fixed

## Description

Admin can impersonate own account; no self-block like deactivate.

## Steps to Reproduce

Impersonate self causes confusing session state.

## Affected Files

- `server/api/admin/impersonate.post.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
