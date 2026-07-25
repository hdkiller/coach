# 373 — Third-Party Actions Are Tag-Pinned, Not SHA-Pinned

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

Every action reference in the repo uses a mutable tag. Git tags can be repointed by
the action's maintainer (or by anyone who compromises their account), so `@v1` today
and `@v1` tomorrow are not guaranteed to be the same code.

This matters most for actions that run on the **self-hosted** runner, which has a
persistent filesystem, a persistent buildx builder, and access to deploy secrets via
`secrets: inherit`:

| Action                                                        | Used in                                     | Runner      |
| ------------------------------------------------------------- | ------------------------------------------- | ----------- |
| `sarisia/actions-status-discord@v1`                           | `deploy.yml`, `reusable-trigger-deploy.yml` | self-hosted |
| `google-labs-code/jules-action@v1.0.0`                        | `jules.yml`                                 | ubuntu      |
| `docker/*-action@v3` / `@v5`                                  | `deploy.yml`                                | self-hosted |
| `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` | all                                         | both        |

`sarisia/actions-status-discord@v1` is the sharpest edge: a third-party action on a
floating major tag, running on the self-hosted box, in a job that holds registry and
deploy credentials.

Separately, `docker/build-push-action@v5` is a full major version behind (v6 is
current), and `actions/checkout` is inconsistent — `@v5` in `publish-mcp.yml`, `@v4`
everywhere else.

Fix direction: pin third-party actions to full commit SHAs with a version comment,
e.g.

```yaml
uses: sarisia/actions-status-discord@1e8e42c73a95b5b8a4e1b1e5f7dcbbb1e1e1e1e1 # v1.15.3
```

First-party `actions/*` are lower risk and can reasonably stay on tags; decide
whether to include them. Dependabot with `package-ecosystem: github-actions` keeps
SHA pins updated automatically and is worth enabling alongside this.

## Steps to Reproduce

Static — `grep -rn "uses:" .github/workflows/`.

## Affected Files

- `.github/workflows/deploy.yml`
- `.github/workflows/reusable-trigger-deploy.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/publish-mcp.yml`
- `.github/workflows/jules.yml`
- `.github/workflows/debug-trigger-auth.yml`

## Acceptance Criteria

- [ ] All third-party (non-`actions/*`) actions pinned to a commit SHA with a version comment
- [ ] `docker/build-push-action` bumped to v6 and the deploy verified end to end
- [ ] `actions/checkout` version consistent across all workflows
- [ ] Dependabot configured for `github-actions` so pins do not rot
