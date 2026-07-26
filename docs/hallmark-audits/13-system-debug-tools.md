# Hallmark Audit — Category 13: System Debug Tools

**Audited Routes (5 total)**:
- `app/pages/debug/index.vue` (Debug Portal Overview)
- `app/pages/debug/sentry.vue` (Sentry Error Testing Tool)
- `app/pages/debug/websocket.vue` (WebSocket Connection Inspector)
- `app/pages/ai/logs/index.vue` & `[id].vue` (AI Call Tracing & Latency Explorer)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Plain Unformatted JSON Output Containers
- **Where**: `app/pages/debug/websocket.vue:L45` & `app/pages/ai/logs/[id].vue:L60`
- **Tell**: `<pre class="bg-gray-100 dark:bg-gray-900 p-4">` unstyled text box for raw JSON payloads.
- **Fix**: Use structured `JsonViewer` component with syntax highlighting and copy button.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Standard Button Trigger Row
- **Where**: `app/pages/debug/sentry.vue:L30`
- **Tell**: Generic horizontal flex row of action buttons.
- **Fix**: Add clear diagnostic section titles and badge status callouts.

---

## 🔍 Minor Findings

### 1. Monospace Font Class Consistency
- **Where**: `app/pages/debug/index.vue:L15`
- **Tell**: Uses mixed `font-mono` vs default body font for debug path labels.
- **Fix**: Consistently apply `font-mono text-xs` to technical debug tokens.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 5
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
