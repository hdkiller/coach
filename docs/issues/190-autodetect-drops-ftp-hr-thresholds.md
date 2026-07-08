# 190 — Autodetect Drops Ftp Hr Thresholds

**Type:** Bug  
**Priority:** High  
**Area:** `profile, integrations`  
**Status:** Open

## Description

Basic Settings autodetect strips ftp/maxHr/lthr from preview and PATCH payload.

## Steps to Reproduce

Autodetect finds FTP; modal never shows or saves it.

## Affected Files

- `app/components/profile/BasicSettings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
