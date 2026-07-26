# E2E testing runbook & development guide

Shared end-to-end backend stack and testing guide for **web (Playwright)** and **companion mobile (Maestro/Detox)** tests.

## Stack Architecture

| Service           | Host port | Notes                                                   |
| ----------------- | --------- | ------------------------------------------------------- |
| Postgres          | `5440`    | DB `coach_e2e` — isolated from local dev on `5439`      |
| Redis (Dragonfly) | `6389`    | Dedicated instance; isolated from local `6379`          |
| Nuxt / API        | `3199`    | Host runner (`pnpm e2e:app:host`) or Docker (`app-e2e`) |

- Compose file: `docker-compose.e2e.yml`
- Environment config: `.env.e2e` (copied from `.env.e2e.example`)

---

## Quick Start & Commands

### One-Time Setup

```bash
cp .env.e2e.example .env.e2e
pnpm e2e:up:infra
pnpm e2e:db:prepare
pnpm e2e:app:host
```

### Day-to-Day Development Workflow

```bash
# 1. Ensure backend infra & host app are running
pnpm e2e:up:infra       # Starts Postgres (5440) + Redis (6389)
pnpm e2e:app:host       # Runs Nuxt dev server on port 3199 with E2E_MODE=true

# 2. Reset / re-seed database fixtures on demand
pnpm e2e:reset

# 3. Run E2E test suite
pnpm test:e2e          # Headless Playwright test suite (Parallel workers enabled)
pnpm test:e2e:ui       # Interactive Playwright Test UI
```

---

## Parallel Execution & Performance

Playwright is configured in `playwright.config.ts` for file-level worker parallelism:

```ts
export default defineConfig({
  testDir: './e2e/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // Ensures test order within a single spec file remains sequential
  workers: process.env.CI ? 2 : undefined, // Uses 50% of CPU cores locally, 2 in CI
  ...
})
```

- **Performance**: Running test files across multiple workers reduces the full suite run time from ~35+ seconds down to **~14 seconds**.
- **Worker Isolation**: Each Playwright worker runs in an isolated browser process. Test files consume deterministic seed data created during `globalSetup`.

---

## Best Practices & Guidelines for E2E Development

To maintain a fast, reliable, and scalable E2E test suite during active feature development, follow these core principles:

### 1. Use the Page Object Model (POM)

All page element locators and page-level interactions must be encapsulated in dedicated Page Object classes in `e2e/pages/`.

Existing Page Objects:

- `DashboardPage.ts` (`/dashboard` links, recommendation cards, refine modals)
- `CalendarPage.ts` (`/calendar` grid, workout cards, add workout buttons)
- `ChatPage.ts` (`/chat` input area, message list, new chat triggers)
- `AdminPage.ts` (`/admin` navigation, environment stats, system message controls)
- `ActivitiesPage.ts` (`/activities`, `/fitness`, `/nutrition` page wrappers)
- `SettingsPage.ts` (`/settings` sub-tab routing for Apps, AI Coach, Developer, Danger Zone)

**Example Usage**:

```ts
import { test, expect } from '../fixtures/test-fixtures.ts'
import { DashboardPage } from '../pages/DashboardPage.ts'

test('renders dashboard', async ({ authedPage }) => {
  const dashboard = new DashboardPage(authedPage)
  await dashboard.goto()

  if (await dashboard.refineButton.isVisible()) {
    await dashboard.refineButton.click()
    await expect(dashboard.refineModal).toBeVisible()
  }
})
```

### 2. Resilient & Accessible Locators

- **DO**: Use user-visible accessibility roles (`getByRole`), aria labels (`getByLabel`), text contents (`getByText`), or explicit `data-testid` attributes.
- **DON'T**: Rely on raw container tags like `locator('main')` or `locator('body')` for visibility checks. Nuxt UI components and layout wrappers (`UDashboardPanel`, `UDashboardGroup`) do not render a `<main>` HTML tag and may temporarily apply `hidden` classes during hydration transitions.

```ts
// ❌ Fragile: Fails when layouts transition or lack <main> tags
await expect(page.locator('main')).toBeVisible()

// ✅ Resilient: Target specific semantic headings or interactive elements
await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
await expect(page.getByText(/E2E Endurance Ride/i).first()).toBeVisible()
```

### 3. Use Auth Fixtures

Never duplicate manual login flows inside test files. Use custom fixtures from `e2e/fixtures/test-fixtures.ts`:

- `authedPage`: Automatically authenticated as standard athlete (`e2e-athlete@coachwatts.test`) via `/api/__e2e/login`.
- `adminPage`: Automatically authenticated as admin (`e2e-admin@coachwatts.test`) via `/api/__e2e/login`.

### 4. Test State Isolation (Read-Only vs State Mutating)

- **Read-Only Tests**: Safely share deterministic seed data created in `e2e/seed.ts` (e.g. seeded workouts, active training plan, recommendations).
- **State-Mutating Tests**: If a test creates, updates, or deletes data (e.g., deleting a user or modifying a workout), generate unique dynamic UUIDs or timestamped emails (e.g. `test-workout-${Date.now()}`) so parallel workers never collide or pollute shared fixtures.

### 5. Timezone Awareness

All E2E database dates are stored in UTC. Tests asserting date display strings should account for user local day boundaries, matching the project's strict timezone rules documented in `docs/04-guides/timezone-handling.md`.

### 6. Targeted Development Execution (Speed Over Full Runs)

During active feature development, bug fixing, or test writing, **only run the relevant test file or spec pattern** to iterate quickly:

```bash
# Run only a specific test spec file
pnpm exec playwright test e2e/tests/dashboard.spec.ts

# Run tests matching a specific title pattern
pnpm exec playwright test -g "morning check-in"

# Focus visually on specific tests using the Playwright UI
pnpm test:e2e:ui
```

> **Mandatory Rule**: Only run the full E2E test suite (`pnpm test:e2e`) when feature implementation is considered complete, right before committing changes or opening a pull request. Avoid running the entire suite repeatedly while actively tweaking a single component or test case.

### 7. LLM Response Mocking (`tests/fixtures/llm-mocks/`)

To prevent API costs, rate-limiting, external latency, and non-deterministic response flakiness during Playwright E2E and background task execution, the system supports zero-latency flat-file LLM response mocking:

- **Environment Flag**: Set `MOCK_LLM_RESPONSES=true` in `.env.e2e` (default in E2E runs).
- **Flat Fixtures Location**: `tests/fixtures/llm-mocks/`
  - `workout_analysis.json` — Workout AI analysis scores, technical/effort explanations, and strengths/weaknesses.
  - `activity_recommendation.json` — Daily readiness scores, workout modifications, and fueling recommendations.
  - `daily_checkin.json` — Check-in summary and coach notes.
  - `daily_coach_suggestion.json` — Daily coach guidance and action suggestions.
  - `generate_ad_hoc_workout.json` — Ad-hoc workout title, duration, target TSS, and execution cues.
  - `generate_structured_workout.json` — Structured workout plan draft step definitions and targets.
  - `adjust_structured_workout.json` — Adjusted structured workout plan step definitions.
  - `analyze_plan_adherence.json` — Workout adherence metrics, summary, deviations, and recommendations.
  - `generate_training_block.json` — Multi-week training block goals, focus keys, and week structures.
  - `weekly_plan.json` — Multi-day periodized training plan workouts and TSS distribution.
  - `athlete_profile.json` — Fitness CTL/ATL/TSB, strengths, and recovery capacity.
  - `nutrition_analysis.json` — Macro compliance, data completeness, and quality scores.
  - `default_structured.json` — Fallback fixture for unlisted AI operations.

> **Developer Maintenance Rule**: Whenever you implement a new AI operation or modify an existing structured AI output schema (in `server/utils/gemini.ts` or background triggers), you **MUST** create or update the corresponding JSON file in `tests/fixtures/llm-mocks/${operation}.json` to match the updated schema.

---

## Auth Endpoints (E2E_MODE Only)

| Endpoint                | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `POST /api/__e2e/login` | Session cookie for **web** Playwright     |
| `POST /api/__e2e/token` | Bearer token for **mobile** / API clients |

_Endpoints return 404 unless `E2E_MODE=true`._

Seeded Fixtures:

- Athlete: `e2e-athlete@coachwatts.test`
- Admin: `e2e-admin@coachwatts.test`
- Mobile OAuth public client id: `e2e00000-0000-4000-8000-000000000001`

---

## Remote Test Execution (Mac Mini Host)

For resource-heavy test runs or offloading local execution, use the Mac Mini runner (`hdkiller@100.111.49.87`):

```bash
pnpm e2e:remote                 # Run headless suite on Mac Mini (rsync working tree)
pnpm e2e:remote:branch develop  # Run headless suite against origin/develop on Mini
pnpm e2e:remote:ui              # Interactive Playwright UI locally, stack on Mini
```

---

## GitHub Actions CI

Workflow: [`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml)

- **Triggers**:
  - `workflow_dispatch` (Manual: Actions → **E2E** → Run workflow)
  - `pull_request` targeting `master` branch
  - `pull_request` labeled with `run-e2e`
- **Runner**: Self-hosted runner `mac-mini-e2e` with label `e2e`.
- **Artifacts**: HTML reports and trace logs are retained for 14 days on workflow completion.
