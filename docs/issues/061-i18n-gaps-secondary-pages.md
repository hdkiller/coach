# 061 — Widespread i18n gaps on secondary pages

**Type:** UI (Maintenance)  
**Priority:** Low  
**Area:** `ui/ux`, `infra`  
**Status:** Open

## Description

Many user-facing pages use hardcoded English strings while adjacent areas (dashboard, nutrition, performance, settings) use Tolgee (`useTranslate`). Non-English locale users see a mixed-language experience.

## Examples

| Page / Component | Hardcoded strings |
| ---------------- | ----------------- |
| `app/pages/notifications.vue` | “Mark all as read”, “No notifications yet” |
| `app/pages/recovery/index.vue` | “Recovery History”, “Log event” |
| `app/pages/events/index.vue` | Event action labels |
| `app/pages/reports.vue` | Report UI copy |
| `app/pages/workouts/upload.vue` | Upload flow messages |

## Steps to Reproduce

1. Set UI language to Spanish (or other supported locale).
2. Open Notifications, Recovery, Events, or Reports.
3. Strings remain English while dashboard chrome is translated.

## Expected Behavior

- Consistent Tolgee coverage across all user-facing pages.

## Actual Behavior

- Mixed localized and hardcoded English UI.

## Affected Files

- `app/pages/notifications.vue`
- `app/components/NotificationDropdown.vue`
- `app/pages/recovery/index.vue`
- `app/pages/events/index.vue`
- `app/pages/reports.vue`
- `app/pages/workouts/upload.vue`
- (and others — audit recommended)

## Suggested Fix

Incremental Tolgee extraction per page; add keys to translation files.

## Acceptance Criteria

- [ ] Listed pages use `useTranslate` for user-visible strings
- [ ] No English-only regressions in non-English locales for those flows
