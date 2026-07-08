# 186 — Profile Tab Url Not Synced

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

In-page tab clicks set activeTab but don't update route query; back/forward and deep links break.

## Steps to Reproduce

Click tab then browser back; wrong tab shown.

## Affected Files

- `app/pages/profile/settings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
