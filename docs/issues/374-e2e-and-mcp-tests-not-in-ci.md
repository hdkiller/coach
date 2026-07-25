# 374 — E2E and MCP Test Suites Never Run in CI

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

The repo has substantial test infrastructure that no workflow ever executes. CI runs
only `pnpm test:unit`.

Not covered by any workflow:

- **Playwright E2E** — `pnpm test:e2e`, backed by a full harness: `Dockerfile.e2e`,
  `docker-compose.e2e.yml`, `e2e/scripts/prepare-db.ts`, plus the `e2e:setup`,
  `e2e:up`, `e2e:build` and remote-runner scripts. Currently only ever run by hand.
- **MCP server tests** — `pnpm test:mcp` (`vitest.mcp.config.ts`), a separate suite
  with its own config. Notably, `publish-mcp.yml` publishes the MCP server to the
  public registry without running these first.
- **Coverage** — `pnpm test:coverage` exists but no threshold is enforced anywhere.

Consequences: E2E regressions are only caught when someone remembers to run the
suite locally, and an MCP release can ship untested.

Practical sequencing:

1. `test:mcp` is cheap and needs no services — add it to `ci.yml` and make it a
   prerequisite of `publish-mcp.yml`. Do this first.
2. E2E needs Postgres and Redis. Either use GitHub `services:` containers, or run
   the existing docker-compose harness on the self-hosted runner (which already has
   Docker and persistent state). Decide which before implementing.
3. Decide whether E2E runs on every PR or only on master / nightly — the full suite
   may be too slow to gate every PR.

## Steps to Reproduce

Static — compare the `scripts` block in `package.json` against the steps in
`.github/workflows/ci.yml`.

## Affected Files

- `.github/workflows/ci.yml`
- `.github/workflows/publish-mcp.yml`
- `docker-compose.e2e.yml`, `Dockerfile.e2e`
- `e2e/scripts/*`
- `vitest.mcp.config.ts`

## Acceptance Criteria

- [ ] `pnpm test:mcp` runs in CI
- [ ] `publish-mcp.yml` cannot publish without the MCP tests passing
- [ ] A decision recorded on where E2E runs (hosted services vs self-hosted compose)
- [ ] E2E wired into a workflow on the agreed cadence (per-PR, master, or nightly)
- [ ] E2E failures block the deploy when they run on master
