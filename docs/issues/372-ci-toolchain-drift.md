# 372 — CI and Deploy Workflows Disagree on the Toolchain

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

The workflows use three different ways to declare the same toolchain, so CI can pass
on one Node/pnpm combination while the deploy runs on another.

| Workflow                      | Node                           | pnpm                                             |
| ----------------------------- | ------------------------------ | ------------------------------------------------ |
| `ci.yml`                      | `node-version: 24` (hardcoded) | `action-setup@v4`, version from `packageManager` |
| `reusable-trigger-deploy.yml` | `node-version-file: .nvmrc`    | `action-setup@v3`, `version: 9.13.0` hardcoded   |
| `debug-trigger-auth.yml`      | `node-version-file: .nvmrc`    | `action-setup@v3`, `version: 9.13.0` hardcoded   |
| `Dockerfile`                  | `node:24-slim`                 | corepack, from `packageManager`                  |

`.nvmrc` says `24.18`; `ci.yml` says `24`, which resolves to whatever the latest 24.x
on the runner image is. `package.json` already pins both authoritative values
(`engines.node: ">=24.11.0 <25.0.0"` and `packageManager: pnpm@9.13.0+sha512...`).

The Trigger.dev CLI version has the same problem — `4.5.4` is hardcoded in three
places (`deploy.yml` input, the reusable workflow's default, and the debug workflow)
while the real source of truth is `@trigger.dev/sdk` in `package.json`. A dependency
bump updates the SDK and silently leaves the deploy CLI behind.

Target state:

- Every workflow uses `node-version-file: .nvmrc`.
- Every workflow uses `pnpm/action-setup@v4` with no `version:`, letting it read
  `packageManager` from `package.json`.
- The Trigger.dev CLI version is derived from the installed SDK version rather than
  restated, or at minimum restated in exactly one place.

## Steps to Reproduce

Static — compare the `Setup Node.js` and `Setup pnpm` steps across the workflows
listed above.

## Affected Files

- `.github/workflows/ci.yml`
- `.github/workflows/reusable-trigger-deploy.yml`
- `.github/workflows/debug-trigger-auth.yml`
- `.github/workflows/deploy.yml` (`trigger-version` input)

## Acceptance Criteria

- [ ] All workflows resolve Node from `.nvmrc`
- [ ] All workflows resolve pnpm from `packageManager` via `action-setup@v4`
- [ ] Trigger.dev CLI version stated once (or derived from the SDK dependency)
- [ ] A Node or pnpm bump requires editing exactly one file
