# Hallmark Audit — Master Summary & Punch List

**Project**: Coach Watts ([`coach-wattz`](file:///Users/hdkiller/Develop/coach-wattz))  
**Auditor**: Hallmark (`hallmark audit`) v1.1.0  
**Scope**: 156 routes across 7 layouts (100% Comprehensive Frontend Audit)  
**Declared System**: Genre: `atmospheric` · Tone: `athletic` · Theme: `custom green-ink` · Display: `Oswald` · Body: `Public Sans`

---

## 📊 Complete Executive Scorecard

| # | Category | Routes | Remediation Status | Critical | Major | Minor | Report Link |
|---|---|---|---|---|---|---|---|
| 1 | **Public Marketing & Landing** | 15 | 🎉 100% Resolved | 2 | 2 | 1 | [01-public-marketing-and-landing.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/01-public-marketing-and-landing.md) |
| 2 | **Core Athlete Workspace** | 7 | 🎉 100% Resolved | 2 | 1 | 1 | [02-core-athlete-workspace.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/02-core-athlete-workspace.md) |
| 3 | **Workouts & Activities** | 10 | 🎉 100% Resolved | 2 | 1 | 1 | [03-workouts-and-activities.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/03-workouts-and-activities.md) |
| 4 | **Analytics & Performance** | 13 | 🎉 100% Resolved | 1 | 1 | 1 | [04-analytics-and-performance.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/04-analytics-and-performance.md) |
| 5 | **Nutrition & Fueling** | 3 | 🎉 100% Resolved | 1 | 1 | 1 | [05-nutrition-and-fueling.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/05-nutrition-and-fueling.md) |
| 6 | **Integrations & OAuth** | 12 | 🎉 100% Resolved | 1 | 1 | 1 | [06-integrations-and-oauth.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/06-integrations-and-oauth.md) |
| 7 | **Library & Training Plans** | 15 | 🎉 100% Resolved | 1 | 1 | 1 | [07-library-and-training-plans.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/07-library-and-training-plans.md) |
| 8 | **Coaching & Team Portal** | 13 | 🎉 100% Resolved | 1 | 1 | 1 | [08-coaching-and-team-portal.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/08-coaching-and-team-portal.md) |
| 9 | **Profile & Settings** | 12 | 🎉 100% Resolved | 1 | 1 | 1 | [09-profile-and-settings.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/09-profile-and-settings.md) |
| 10 | **Public Shared Tokens** | 7 | 🎉 100% Resolved | 1 | 1 | 1 | [10-public-shared-tokens.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/10-public-shared-tokens.md) |
| 11 | **Documentation & Developer** | 4 | 🎉 100% Resolved | 1 | 1 | 1 | [11-documentation-and-developer.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/11-documentation-and-developer.md) |
| 12 | **Admin Suite** | 30 | 🎉 100% Resolved | 1 | 1 | 1 | [12-admin-suite.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/12-admin-suite.md) |
| 13 | **System Debug Tools** | 5 | 🎉 100% Resolved | 1 | 1 | 1 | [13-system-debug-tools.md](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/13-system-debug-tools.md) |
| **TOTAL** | **13 Categories** | **156** | 🎉 **100% Patched** | **16** | **14** | **13** | **43 / 43 Findings Resolved** |

---

## 🎯 Master Progress Tracker
Live status tracking is maintained in: **[`docs/hallmark-audits/AUDIT_PROGRESS_TRACKER.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/hallmark-audits/AUDIT_PROGRESS_TRACKER.md)**

---

## 🥊 Top Priority Punch List (16 Critical Anti-Patterns)

1. **Simulated AI Chat Prompt in Auth Aside** ([`app/pages/join.vue:L26`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L26)): Re-drawn UI chrome & fake conversation.
2. **Card-in-Card Nesting in Landing Hero** ([`app/components/landing/Hero.vue:L61`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/Hero.vue#L61)): Multi-layered bordered cards.
3. **Italicized Subtitle Headline** ([`app/pages/workouts/upload.vue:L32`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/upload.vue#L32)): Violates typography purity (`38a` gate).
4. **Dashboard Header Action Clutter** ([`app/pages/dashboard.vue:L10`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue#L10)): 6 action buttons in top nav bar.
5. **Tool Call Card Width Overflow on Mobile Chat** ([`app/components/chat/ChatToolCall.vue:L15`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatToolCall.vue#L15)): Parameters clip at 320px.
6. **Hardcoded Red Borders in Danger Zone** ([`app/pages/settings/danger.vue:L30`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/settings/danger.vue#L30)): Bypasses `color="error"` tokens.
7. **Template-Swapped Connect Pages** (`connect-*.vue`): 10 identical card-layout files.
8. **Plain White Canvas Container in Public Coach Rail** (`CoachStartPageEditorRail.vue:L40`): Bypasses dark green-ink paper tokens.
9. **Hardcoded Plain Red/Blue Chart Color Fallbacks** (`AnalyticsChart.vue`): Raw browser hex colors instead of oklch theme variables.
10. **Hardcoded Macro Progress Ring Colors** ([`app/pages/nutrition/index.vue:L120`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/index.vue#L120)): Un-themed progress rings.
11. **Hardcoded Plain White Price Card Highlights** (`PublicPlansCatalogPage.vue:L60`): Pure white `#ffffff` cards (`Pure black, pure white` gate).
12. **Standard 4-Column SaaS Docs Footer** (`app/layouts/docs.vue:L50`): AI footer anti-pattern on docs layout.
13. **Hardcoded Grey Footer Chrome on Share Layout** (`app/layouts/share.vue:L35`): Un-themed footer band.
14. **Manual HTML Table Mobile Scroll Overflow** ([`app/pages/activities.vue:L300`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue#L300)): Missing scroll wrapper on activities table.
15. **Manual Table Density in Admin Stats** ([`app/pages/admin/stats/llm/index.vue:L40`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/admin/stats/llm/index.vue#L40)): Missing compact tabular numbers.
16. **Plain Unformatted JSON Containers** ([`app/pages/debug/websocket.vue:L45`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/debug/websocket.vue#L45)): Raw `<pre>` JSON dumps.
