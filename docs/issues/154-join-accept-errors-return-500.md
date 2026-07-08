# 154 — Join Accept Errors Return 500

**Type:** Bug  
**Priority:** Medium  
**Area:** `coaching, backend`  
**Status:** Fixed

> **Fixed (2026-07-08):** Join accept handler maps repository validation errors (wrong email, self-invite, expired code) to 4xx responses instead of HTTP 500.

## Description

Join validation errors return HTTP 500.

## Steps to Reproduce

Wrong email gives 500.

## Affected Files

- `server/api/join/[code].post.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
