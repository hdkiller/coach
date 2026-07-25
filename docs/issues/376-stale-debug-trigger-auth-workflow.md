# 376 — Stale `debug-trigger-auth` Workflow Still Present

**Type:** Maintenance  
**Priority:** Low  
**Area:** `infra`  
**Status:** Open

## Description

`.github/workflows/debug-trigger-auth.yml` is a leftover troubleshooting workflow
from diagnosing Trigger.dev authentication. It is `workflow_dispatch`-only, runs on
the **self-hosted** runner, and pulls `TRIGGER_ACCESS_TOKEN`, `TRIGGER_PROJECT_REF`
and `TRIGGER_API_URL` from the `preview` environment in order to print their lengths
and run `whoami` / `projects list`.

It is written carefully — it prints `${#VAR}` lengths, never values — so this is
housekeeping rather than a live exposure. But it is a dispatchable job that puts
deploy credentials on the runner for no ongoing purpose, and it carries its own
hardcoded copies of the pnpm version and the Trigger.dev CLI version (see
[372](./372-ci-toolchain-drift.md)), so it is one more place that drifts.

Decide: delete it, or if the debug path is genuinely still useful, fold it into
`reusable-trigger-deploy.yml` as an opt-in input (`debug: true`) so there is one
workflow and one set of pinned versions.

## Steps to Reproduce

Static — the workflow exists and has had no non-mechanical change since the
Trigger.dev auth investigation it was written for.

## Affected Files

- `.github/workflows/debug-trigger-auth.yml`

## Acceptance Criteria

- [ ] Confirmed the Trigger.dev auth issue it was written for is resolved
- [ ] Workflow deleted, or merged into the reusable deploy workflow behind an input
- [ ] No standalone workflow exposes deploy secrets purely for diagnostics
