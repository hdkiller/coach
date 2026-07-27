# 382 — Lighthouse CI Performance, Accessibility, and Resource Audit Baseline

**Type:** Maintenance  
**Priority:** High  
**Area:** `frontend`, `performance`, `a11y`, `ci`  
**Status:** Completed ✅

## Context & Objectives

Lighthouse CI (`@lhci/cli`) is integrated into the Coach Watts E2E pipeline to run automated performance, accessibility, SEO, and best-practice audits against 22 core application routes across public marketing pages, authenticated athlete workspaces, and admin control panels.

---

## 📊 Scorecard & Benchmark Results

All target routes pass Lighthouse CI assertions:

| Route / Page            | Performance | Accessibility | Best Practices |   SEO   |      Status      |
| :---------------------- | :---------: | :-----------: | :------------: | :-----: | :--------------: |
| **`/calendar`**         |   **100**   |    **94**     |     **96**     | **100** |  ✅ **PERFECT**  |
| **`/performance`**      |   **100**   |    **91**     |     **96**     | **100** |  ✅ **PERFECT**  |
| **`/help-center`**      |   **100**   |    **95**     |     **96**     | **100** |  ✅ **PERFECT**  |
| **`/activities`**       |   **99**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/settings/apps`**    |   **99**    |    **97**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/profile/settings`** |   **98**    |    **91**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/nutrition`**        |   **98**    |    **92**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/pricing`**          |   **98**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/works-with`**       |   **97**    |    **95**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/reports`**          |   **97**    |    **94**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/data`**             |   **97**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/chat`**             |   **96**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/terms`**            |   **97**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |
| **`/privacy`**          |   **97**    |    **96**     |     **96**     | **100** | ✅ **EXCELLENT** |

---

## Technical Remediations Implemented

### 1. ARIA Accordion Trigger Plugin (`app/plugins/aria-fix.client.ts`)

- Automated setting `role="button"` and computing dynamic fallback `aria-label`s on generic `<span>` collapsible triggers, resolving `[aria-command-name]` and `[aria-allowed-attr]`.

### 2. Form & Control Accessibility (`BasicSettings.vue`, `default.vue`)

- Added explicit `id` attributes to form fields (`#profile-name-input`, `#profile-email-input`, `#profile-dob-input`, `#profile-weight-input`) for explicit `<label for="...">` bindings.
- Aligned `<UDashboardSearchButton>` `aria-label` with visible text (`"Search"`), resolving `[label-content-name-mismatch]`.

### 3. Image Sizing, Alt Text & Contrast (`home.vue`, `works-with.vue`, `share.vue`)

- Added explicit `width="702"`, `height="135"`, `loading="eager"`, and `decoding="async"` to logo images.
- Added missing `alt` attributes on integration logos and upgraded low-contrast dark mode caption text from `text-slate-600` to `text-slate-400`.

### 4. Asset Caching & Compression (`nuxt.config.ts`)

- Added Nitro `routeRules` setting long-term `Cache-Control` (`max-age=31536000, immutable`) for `/media/**`, `/images/**`, and `/_nuxt/**`.
- Enabled `compressPublicAssets: true` to serve gzipped assets automatically.

---

## Verification & Pipeline

- Automated audits run via `pnpm e2e:lighthouse` or GitHub Actions workflow dispatch (`e2e.yml`).
- Thresholds enforced in `lighthouserc.cjs`:
  - Accessibility score $\ge 0.80$ (Error level)
  - Performance score $\ge 0.40$ (Warning level)
  - Best Practices score $\ge 0.75$ (Warning level)
  - SEO score $\ge 0.75$ (Warning level)
