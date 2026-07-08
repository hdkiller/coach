# 144 — Admin Issue Reactions No Admin Check

**Type:** Bug  
**Priority:** High  
**Area:** `admin, backend`  
**Status:** Open

## Description

Issue reaction APIs lack isAdmin check.

## Steps to Reproduce

Non-admin can react.

## Affected Files

- `server/api/admin/issues/[id]/reaction.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
