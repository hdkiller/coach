# 369 — Docker `latest` Tag Published From Any Branch

**Type:** Bug  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

`docker/metadata-action` in the deploy workflow lists `latest` as a bare tag value:

```yaml
tags: |
  type=sha,format=long
  type=ref,event=branch
  latest
```

A bare `latest` is unconditional — it is emitted on **every** run of the workflow,
including `workflow_dispatch` runs started from a non-default branch. Since the push
step publishes all generated tags, dispatching the deploy workflow from a feature
branch overwrites `ghcr.io/hdkiller/coach:latest` with that branch's image.

The idiomatic form restricts it to the default branch:

```yaml
type=raw,value=latest,enable={{is_default_branch}}
```

## Open Question (needs decision before fixing)

Whoever picks this up needs to confirm **what actually consumes `:latest`** before
changing it. Two possibilities, with different fixes:

1. **Dokploy pulls `:latest`.** Then gating on `is_default_branch` is correct and
   sufficient — but it also means dispatching the workflow from a branch today
   silently deploys that branch to the Dokploy target. Verify whether that is a
   deliberate "deploy a branch" escape hatch that someone relies on.
2. **Dokploy pins a specific tag** (e.g. the `sha-` tag or the branch tag). Then
   `latest` is decorative, and the fix is either the `is_default_branch` gate or
   dropping the tag entirely.

Check the Dokploy application config for the image reference it pulls, then decide.
Note that `concurrency` was added to the deploy workflow (see the CI/CD hardening
batch), so concurrent overwrites of `latest` from two master pushes are already
prevented — this issue is only about the _branch_ dimension.

## Steps to Reproduce

1. Push a feature branch.
2. Run the "Build and Deploy to Dokploy" workflow manually against that branch via
   `workflow_dispatch`.
3. Inspect `ghcr.io/hdkiller/coach:latest` — it now points at the feature branch build.

## Affected Files

- `.github/workflows/deploy.yml` (metadata-action `tags:` block)

## Acceptance Criteria

- [ ] Documented which image reference Dokploy actually pulls
- [ ] `latest` only moves for builds of the default branch (or the tag is removed)
- [ ] `workflow_dispatch` from a feature branch cannot repoint the production image
- [ ] If branch deploys are a wanted feature, they are explicit rather than a side effect
