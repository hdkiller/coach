# E2E testing runbook

Shared backend stack for **web (Playwright)** and **companion mobile (Maestro/Detox)** tests.

## Stack

| Service           | Host port | Notes                                                   |
| ----------------- | --------- | ------------------------------------------------------- |
| Postgres          | `5440`    | DB `coach_e2e` — never touches local/dev data on `5439` |
| Redis (Dragonfly) | `6389`    | Dedicated; not the local `6379` instance                |
| Nuxt / API        | `3199`    | Docker (`app-e2e`) or host (`pnpm e2e:app:host`)        |

Compose file: `docker-compose.e2e.yml`  
Env template: `.env.e2e.example` → copy to `.env.e2e`

## One-time setup

```bash
cp .env.e2e.example .env.e2e
pnpm e2e:setup
```

`e2e:setup` starts Postgres + Redis, migrates/resets/seeds, then builds and starts the Docker app. The first app build can take several minutes (`Dockerfile.e2e`).

## Day-to-day

```bash
# Start / stop full stack
pnpm e2e:up
pnpm e2e:down

# Infra only (then run app on the host)
pnpm e2e:up:infra
pnpm e2e:db:prepare
pnpm e2e:app:host

# Reset DB (truncate + re-seed) while stack is up
pnpm e2e:reset

# Web E2E
pnpm test:e2e
pnpm test:e2e:ui
```

Playwright’s global setup re-runs DB prepare and waits for `GET /api/health` on `E2E_BASE_URL` (default `http://localhost:3199`).

## Auth helpers (E2E_MODE only)

| Endpoint                | Use                                       |
| ----------------------- | ----------------------------------------- |
| `POST /api/__e2e/login` | Cookie session for **web** Playwright     |
| `POST /api/__e2e/token` | Bearer token for **mobile** / API clients |

Both return 404 unless `E2E_MODE=true`.

Seeded fixtures:

- Athlete: `e2e-athlete@coachwatts.test`
- Admin: `e2e-admin@coachwatts.test`
- Mobile OAuth public client id: `e2e00000-0000-4000-8000-000000000001`
- Completed today `ActivityRecommendation` for the athlete (UTC)

Example Bearer mint:

```bash
curl -s -X POST http://localhost:3199/api/__e2e/token \
  -H 'content-type: application/json' \
  -d '{"email":"e2e-athlete@coachwatts.test"}'
```

## Mobile companion

Point the app / Maestro / Detox at the same API:

| Runtime          | Base URL                    |
| ---------------- | --------------------------- |
| iOS Simulator    | `http://localhost:3199`     |
| Android emulator | `http://10.0.2.2:3199`      |
| Physical device  | `http://<your-lan-ip>:3199` |

Use `POST /api/__e2e/token` (or `e2e/helpers/token.ts`) instead of full PKCE during automated runs. Production mobile auth remains OAuth PKCE against this same API.

## Scripts

| Script                           | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `e2e:setup`                      | Infra + DB prepare + Docker app      |
| `e2e:up` / `e2e:down`            | Full compose up/down                 |
| `e2e:up:infra`                   | Postgres + Redis only                |
| `e2e:build`                      | Rebuild `app-e2e` image              |
| `e2e:db:prepare` / `e2e:reset`   | Migrate, truncate, seed              |
| `e2e:app:host`                   | Nuxt dev on host with `.env.e2e`     |
| `test:e2e`                       | Playwright                           |
| `test:e2e:ui`                    | Playwright UI Mode (local stack)     |
| `e2e:sync`                       | rsync working tree → Mac Mini        |
| `e2e:checkout`                   | git fetch + check out branch on Mini |
| `e2e:remote`                     | sync + run Playwright on Mini        |
| `e2e:remote:branch`              | checkout branch on Mini + Playwright |
| `e2e:remote:up`                  | ensure Mini infra + app only         |
| `e2e:remote:ui`                  | ensure Mini + tunnel + UI Mode       |
| `e2e:tunnel` / `e2e:tunnel:stop` | SSH forwards for :3199/:5440/:6389   |

## Mac Mini (preferred remote host)

Office Mini (`hdkiller@100.111.49.87` / Tailscale) runs the same e2e stack so the laptop stays free. Inventory notes: `~/Develop/hdkiller/docs/servers/mac-mini.md`.

| Command                                | Where  | What                                                       |
| -------------------------------------- | ------ | ---------------------------------------------------------- |
| `pnpm e2e:sync`                        | laptop | rsync working tree → `~/Develop/coach-wattz` on Mini       |
| `pnpm e2e:checkout [branch]`           | laptop | `git fetch` + hard reset Mini to `origin/<branch>`         |
| `pnpm e2e:remote`                      | laptop | sync (default) + SSH into Mini + infra/app + Playwright    |
| `pnpm e2e:remote:branch [branch]`      | laptop | checkout `origin/<branch>` on Mini + Playwright (no rsync) |
| `E2E_REMOTE_SYNC=0 pnpm e2e:remote`    | laptop | skip rsync                                                 |
| `pnpm e2e:remote:up`                   | laptop | ensure Mini stack (no tests); sync off by default          |
| `pnpm e2e:remote:ui`                   | laptop | ensure Mini + tunnel + open Playwright UI locally          |
| `E2E_REMOTE_SYNC=1 pnpm e2e:remote:ui` | laptop | rsync first, then UI                                       |
| `pnpm e2e:tunnel`                      | laptop | SSH tunnel only (`127.0.0.1:3199` → Mini)                  |
| `pnpm e2e:tunnel:stop`                 | laptop | tear down tunnel                                           |

```bash
pnpm e2e:remote                 # headless suite on Mini (rsync working tree)
pnpm e2e:remote:branch develop  # headless suite against origin/develop on Mini
pnpm e2e:remote:ui              # interactive UI on laptop, stack on Mini
```

Use **`e2e:remote`** when you want uncommitted laptop changes on the Mini. Use **`e2e:remote:branch`** when you want a clean `origin/<branch>` (must be pushed). Default branch is the laptop’s current branch; override with an argument or `E2E_REMOTE_BRANCH`.

`e2e:remote:ui` keeps Playwright UI on this machine (Chrome for Testing) while the app/DB/Redis stay on the Mini via localhost tunnels. Sync is **off** by default for a fast reopen; pass `E2E_REMOTE_SYNC=1` after local code changes.

On the Mini, `ensure-mini-stack.sh` / `remote-run.sh`:

1. Ensures `.env.e2e`, `pnpm install`, (optional) Playwright Chromium
2. Starts Docker infra (`postgres-e2e` / `redis-e2e`)
3. Starts (or reuses) host Nuxt on `:3199` (`pnpm e2e:app:host`)
4. (`remote-run` only) Runs `pnpm test:e2e`

Serve log: `/tmp/coach-wattz-e2e-serve.log`

Overrides: `E2E_REMOTE_HOST`, `E2E_REMOTE_DIR`, `E2E_REMOTE_BRANCH`. Mini uses `~/.ssh/id_ed25519_github_coach_wattz` for `git fetch` (deploy/user key on GitHub).

Direct Mini app (no tunnel): [http://100.111.49.87:3199/](http://100.111.49.87:3199/)

watts-mobile Maestro on the Mini can point at the same API (`http://localhost:3199` / Android `http://10.0.2.2:3199`).

## GitHub Actions (manual, Mac Mini)

Workflow: [`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml)

- **Trigger:** `workflow_dispatch` only (Actions → **E2E** → Run workflow). No push/PR hooks.
- **Runner:** dedicated self-hosted runner `mac-mini-e2e` with label `e2e` (`~/actions-runner-e2e` on the Mini). Does not use `shadow`, so deploy/CI are not blocked.
- **Stack:** Docker Compose e2e (`pnpm e2e:setup`) + Playwright Chromium.
- **Input:** `ref` (default `develop`) — branch, tag, or SHA to check out.

```bash
gh workflow run e2e.yml -f ref=develop
gh run watch   # optional
```

Artifacts: `playwright-report-<run_id>` (HTML report + failure traces) retained 14 days.

## Notes

- Keep `workers: 1` until tests are isolated per worker DB.
- Do not enable `E2E_MODE` in production.
- Free ports `:3199` / `:5440` / `:6389` on the Mini before a manual host-stack run if an Actions job just finished (or leave `pnpm e2e:down` to the workflow teardown).
