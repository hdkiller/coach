# 382 — Lighthouse CI Performance, Accessibility, and Resource Audit Baseline

**Type:** Maintenance
**Priority:** Medium
**Area:** `frontend`, `performance`, `a11y`, `ci`
**Status:** Open

## Context & Objectives

With Lighthouse CI (`@lhci/cli`) integrated into the E2E pipeline, automated audits run against authenticated routes (`/dashboard`, `/calendar`, `/chat`). This document tracks performance, accessibility, and resource optimization findings discovered during baseline runs.

---

## Key Audit Findings

### 1. DevTools Protocol Snapshot Timeouts (`DOMSnapshot.disable`)

- **Finding**: On complex Nuxt 4 Vue SSR pages, full-page screenshot gathering (`full-page-screenshot` audit) triggers DevTools protocol response timeouts during Lighthouse collection runs in headless Chromium.
- **Remediation**: Added `skipAudits: ['full-page-screenshot']` in `lighthouserc.cjs`.

### 2. Render-Blocking Stylesheets & Fonts

- **Finding**: External CSS stylesheet links (`primer-css`, icon font stylesheets) block initial paint, delaying Largest Contentful Paint (LCP) on low-bandwidth/throttled environments.
- **Remediation Target**: Inline critical CSS or preload non-render-blocking font assets in `nuxt.config.ts`.

### 3. Static Asset Caching Headers (`uses-long-cache-ttl`)

- **Finding**: Local development/test Nitro server responses do not set long-term `Cache-Control` max-age headers for static asset chunks.
- **Remediation Target**: Ensure production Nginx / CDN headers set `max-age=31536000, immutable` on static `/_nuxt/` build assets.

### 4. Accessibility Gaps on Mobile Controls

- **Finding**: Icon-only navigation buttons and modal dismiss triggers on secondary pages and mobile sidebars lack explicit `aria-label` or `aria-labelledby` bindings.
- **Remediation Target**: Audit Nuxt UI v4 components to ensure every icon-only `UButton` includes `aria-label`.

---

## Verification & Tracking

- Automated audits can be executed on local test stack via `pnpm e2e:lighthouse` or local dev instance via `pnpm e2e:lighthouse:dev`.
- CI thresholds enforced in `lighthouserc.cjs`:
  - Accessibility score $\ge 0.80$ (Error level)
  - Performance score $\ge 0.40$ (Warning level for CI headless runner variance)
  - Best Practices score $\ge 0.75$ (Warning level)
  - SEO score $\ge 0.75$ (Warning level)
