# 377 — Production Deploy Runs Under a GitHub Environment Named `preview`

**Type:** Maintenance  
**Priority:** Low  
**Area:** `infra`  
**Status:** Open

## Description

The workflow that builds the production image and triggers the live Dokploy
deployment declares `environment: preview`:

```yaml
build-and-deploy:
  environment: preview
```

and it passes the same name down to the Trigger.dev deploy:

```yaml
deploy-trigger:
  uses: ./.github/workflows/reusable-trigger-deploy.yml
  with:
    environment: preview
    trigger-env: preview
```

So a push to `master` deploys to whatever `preview` points at. The reusable workflow
was clearly written with a `preview` / `production` split in mind — its inputs are
documented as "e.g., preview, production" — but only `preview` is ever used.

This is naming, not a functional bug: the secrets in that environment are the ones
the live deployment uses. The risk is the next person to touch this. Anyone adding a
genuine staging tier will reasonably assume `preview` is already it, and will point
it at a staging Dokploy target or a staging Trigger.dev environment — silently
breaking production deploys, or worse, deploying staging config to production.

It also removes a safety rail: GitHub environments support required reviewers and
deployment branch restrictions. Those are worth having on a production environment,
and are unlikely to be configured on something called `preview`.

Decide the intended topology first:

- If there is only one deployed tier, rename the environment to `production` and
  update both call sites plus the Trigger.dev environment.
- If a staging tier is planned, define both now and make the master push target the
  production one.

Renaming a GitHub environment requires re-creating the secrets under the new name —
coordinate so deploys are not broken in between.

## Steps to Reproduce

Static — inspect `.github/workflows/deploy.yml`. The job that pushes
`ghcr.io/hdkiller/coach:latest` and calls the Dokploy webhook is scoped to the
`preview` environment.

## Affected Files

- `.github/workflows/deploy.yml`
- `.github/workflows/reusable-trigger-deploy.yml`
- `.github/workflows/debug-trigger-auth.yml` (also uses `preview`)
- GitHub repo settings → Environments (secrets must be migrated on rename)

## Acceptance Criteria

- [ ] Intended environment topology decided and written down
- [ ] The environment used by master-push deploys is named for what it actually is
- [ ] Secrets migrated with no gap in deploy capability
- [ ] Branch restrictions (and reviewers, if wanted) configured on the production environment
