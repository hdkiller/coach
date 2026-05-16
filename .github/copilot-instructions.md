# Coach Watts – Copilot Instructions

Coach Watts is a full-stack AI cycling/endurance coach: Nuxt 4 (SSR + API routes), PostgreSQL via Prisma, Trigger.dev for background jobs, Google Gemini for AI, Nuxt UI for components, Pinia for state, Tolgee for i18n, and Stripe for payments.

---

## Commands

```bash
pnpm dev                          # Start dev server (NOTE: never run this as an agent — trust the user's HMR)
pnpm build                        # prisma generate + nuxt build
pnpm lint                         # ESLint check
pnpm lint:fix                     # Auto-fix ESLint issues
pnpm format                       # Prettier format
pnpm test                         # Vitest (all tests)
pnpm test -- path/to/file.test.ts # Run a single test file
pnpm test:coverage                # Coverage report

# Prisma
npx prisma migrate dev --name <descriptive-name>  # Create + apply migration (ONLY way to change schema)
pnpm prisma migrate status                        # Check migration status
pnpm db:deploy                                    # Production: prisma migrate deploy

# CLI
pnpm cw:cli <command> [subcommand] [options]      # Main admin CLI
pnpm cw:cli users search <query>                  # Find user by email/name
pnpm cw:cli db compare                            # Check schema drift vs production
pnpm cw:cli trigger checkin <email>               # Manually trigger daily check-in

# Ad-hoc scripts
npx tsx scripts/<script-name>.ts                  # Run a standalone script
```

---

## Architecture

The app has three primary layers:

1. **Nuxt API layer** (`server/api/`) — RESTful endpoints auto-routed by file path. Server utils in `server/utils/` are **auto-imported** (never manually import them with relative paths).

2. **Background jobs** (`trigger/`) — Trigger.dev v3 tasks for all async work: data ingestion from integrations (Intervals.icu, Whoop, Strava, Garmin, Oura, etc.), AI analysis, and report generation. All tasks are assigned to specific queues (`user-ingestion`, `user-analysis`, `user-reports`) with concurrency limit 2 per user. Always pass `concurrencyKey: userId`.

3. **Frontend** (`app/`) — Nuxt pages/components with Pinia stores (Setup Store syntax only), Tolgee i18n, and Nuxt UI components.

**Key domain modules:**

- **Nutrition Domain** (`server/utils/nutrition-domain/`) — Single source of truth for all metabolic calculations. All nutrition/fueling logic must go here; never replicate in frontend or background jobs.
- **Repository Pattern** (`server/utils/repositories/`) — Use repositories (e.g., `WorkoutRepository`) for complex models. Avoid direct `prisma.model.find*` in API handlers for business logic.
- **Chat** (`server/api/chat/`, `server/utils/chat/`) — Durable chat workflow: each turn creates a `ChatTurn`, is claimed by the app runner, and results stream via WebSocket. Chat history is rebuilt from `ChatMessage` + `ChatTurn` + `ChatTurnEvent` tables. See `docs/04-guides/chat-development.md`.
- **AI** — Gemini 2.5 Flash for daily checks; Gemini 2.5 Pro for deep analysis. Configured in `server/utils/ai-config.ts`.

---

## Critical Rules

### Database / Prisma

- **NEVER** use `prisma db push` or `prisma migrate reset` — both break migration history.
- **Every** change to `prisma/schema.prisma` requires an immediate migration: `npx prisma migrate dev --name <descriptive-name>`. Commit schema + migration together.
- **Fixing drift**: Use `npx prisma migrate diff` to generate SQL, create migration folder manually, then `npx prisma migrate resolve --applied <name>`.
- Use the singleton Prisma client from `server/utils/db.ts`.

### Frontend

- **Semantic colors only**: `primary`, `neutral`, `success`, `error`, `warning`, `info`. Never hardcode hex or raw color names (`gray`, `blue`, `red`).
- **Nuxt UI Modals**: Must use `v-model:open="isOpen"`. For custom card content, use `<template #content>`.
- **Nested containers**: Avoid nesting `UCard` inside `UModal`/`USlideover` body without overriding padding (causes mobile whitespace). Use `:ui="{ body: 'p-0 sm:p-6' }"`.
- **Tables**: Use plain HTML tables in a wrapper div. Do **not** use `UCard` for tables; avoid `UTable` inside complex `UDashboardPanel` structures.
- **Buttons**: Use `UButton`; navbar actions use `size="sm"`, `class="font-bold"` with an icon.

### Vue / Nuxt

- Always use `<script setup>`.
- Pinia stores use **Setup Store** syntax (`defineStore` with setup function), `ref()` for state, `computed()` for getters, `$fetch` for API calls.
- Composables go in `app/composables/` with `use` prefix (e.g., `useFormat`).
- Use `useHead()` for meta tags.

### Chat / AI SDK

- Adhere strictly to **AI SDK v5 `UIMessage` schema** (roles: `user`, `assistant`, `system` only).
- Tool calls/results are `parts` within an `assistant` message using `tool-NAME` type.
- Always use `convertToModelMessages(history, { tools })` to convert history for the model. Never reconstruct tool turns manually.
- Before modifying chat logic, read `vercel-ai-docs/07-reference/01-ai-sdk-core/31-ui-message.mdx`.

### Internationalization (Tolgee)

- Import and initialize `useTranslate` at the **very top** of `<script setup>`.
- Always guard `t` in `computed` properties — it may not be ready during hydration:
  ```typescript
  const labels = computed(() => {
    const isTReady = typeof t === 'function'
    return [{ label: isTReady ? t('nav.home') : 'Home', to: '/' }]
  })
  ```
- Use logical namespaces: `common`, `dashboard`, `activities`, `workout`, `profile`, `fitness`, `plans`, `chat`, `admin`.

### Date / Timezone

- All timestamps stored in **UTC**. Calendar-day fields (`@db.Date`) stored as UTC Midnight.
- Use `server/utils/date.ts` for all backend date logic: `getUserTimezone()`, `getUserLocalDate()`, `getStartOfDayUTC()`.
- Frontend: use `useFormat` composable. For planned workouts / calendar grids use `formatDateUTC()` (not `formatDate()`).
- Deduplication of workouts uses UTC timestamps, not local time strings.

### ESLint / TypeScript

- Zero new linting errors. Run `pnpm lint` before completing any task.
- Prefer `@ts-expect-error` over `@ts-ignore`; always include a description.
- Use constant objects instead of static classes to avoid `no-extraneous-class`:
  ```typescript
  export const MyService = { async doSomething() { ... } }
  ```

### CLI vs. Scripts

- **Always prefer extending `cli/`** over creating a new file in `scripts/`. The CLI is the canonical home for operational tools.
- If a one-off script is unavoidable, use `dotenv/config` + shared `prisma` instance and run via `npx tsx scripts/<name>.ts`.

### Entitlements / Plans

Tiers: `FREE` ($0) | `SUPPORTER` ($8.99/mo) | `PRO` ($14.99/mo). Gate features via `UserEntitlements` object from `server/utils/entitlements.ts`. Pro uses `gemini-pro`; Free/Supporter use Flash.

---

## MCP Servers (configured in `.roo/mcp.json`)

- **nuxt-ui**: `https://ui.nuxt.com/mcp` — component lookup
- **postgres**: local dev DB via Docker (`postgresql://watts:password@localhost:5439/watts`)
- **sentry**: `https://mcp.sentry.dev/mcp/newpush-y4/coach-watts`
- **trigger**: `npx trigger.dev@latest mcp --api-url https://trigger.newpush.com/`

---

## Key Reference Docs

- Architecture: `docs/01-architecture/system-overview.md`
- Chat: `docs/04-guides/chat-development.md`
- Timezone: `docs/04-guides/timezone-handling.md`
- CLI: `docs/04-guides/cli-reference.md`
- Pricing: `docs/06-plans/pricing-and-entitlements.md`
- TypeScript rules: `.roo/rules-code/typescript-guidelines.md`
