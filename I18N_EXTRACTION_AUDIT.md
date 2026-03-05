# i18n Extraction Audit

Scope: profile/settings pages and components restored during functionality recovery.
Method: regex scan for hardcoded text attributes and template text nodes.

| File | has_t_calls | attr_literals | text_nodes |
|---|---:|---:|---:|
| `app/components/profile/BasicSettings.vue` | 0 | 26 | 10 |
| `app/components/profile/CommunicationSettings.vue` | 0 | 21 | 0 |
| `app/components/profile/GoalsSettings.vue` | 0 | 4 | 3 |
| `app/components/profile/MeasurementsSettings.vue` | 0 | 21 | 10 |
| `app/components/profile/NutritionSettings.vue` | 0 | 84 | 29 |
| `app/components/profile/SportSettings.vue` | 0 | 65 | 49 |
| `app/components/profile/TrophyCase.vue` | 0 | 0 | 3 |
| `app/components/profile/ZoneEditor.vue` | 0 | 1 | 2 |
| `app/components/settings/AiAutomationSettings.vue` | 0 | 12 | 7 |
| `app/components/settings/AiCoachSettings.vue` | 0 | 7 | 9 |
| `app/components/settings/AiIdentitySettings.vue` | 0 | 2 | 5 |
| `app/components/settings/AiQuotas.vue` | 0 | 1 | 1 |
| `app/components/settings/AiUsageHistory.vue` | 0 | 1 | 1 |
| `app/components/settings/ConnectedApps.vue` | 0 | 26 | 27 |
| `app/components/settings/DangerZone.vue` | 0 | 16 | 31 |
| `app/pages/profile/settings.vue` | 2 | 1 | 0 |
| `app/pages/fitness/index.vue` | 0 | 11 | 0 |
| `app/pages/settings/billing.vue` | 0 | 12 | 26 |

## Confirmed Example
`app/components/profile/NutritionSettings.vue` currently contains hardcoded UI strings (not translation keys), e.g.:
- `Enable Nutrition System`
- `Missing Profile Information`
- `Go to Basic Settings`
- `Metabolic Profile`

## Update (2026-03-05)
- Completed full extraction pass for:
  - `app/components/profile/NutritionSettings.vue`
  - `app/components/settings/AiAutomationSettings.vue`
  - `app/components/settings/AiCoachSettings.vue`
  - `app/components/settings/AiIdentitySettings.vue`
  - `app/components/settings/AiQuotas.vue`
  - `app/components/settings/AiUsageHistory.vue`
- Verified `NutritionSettings.vue` translation key coverage with a strict scan (`t`, `tr`, `t.value`): **0 missing keys**.
- Removed remaining hardcoded user-facing labels in usage/settings views (tier badges, pagination summary, status/action labels, view-details aria text).
