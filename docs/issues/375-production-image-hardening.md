# 375 — Production Image Ships Dev Dependencies and Runs as Root

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

The runner stage of the production `Dockerfile` has three issues:

**1. Dev dependencies ship to production.** The runner copies `node_modules`
wholesale out of the builder:

```dockerfile
COPY --from=builder /app/node_modules ./node_modules
```

That tree was installed with `pnpm install --frozen-lockfile` (no `--prod`), so it
contains Nuxt, Vite, Vitest, Playwright, ESLint, TypeScript and everything else in
`devDependencies`. This inflates the image, slows every pull on the Dokploy host, and
widens the CVE surface of the running container for packages that are never executed.

Fix: add a dedicated production-deps stage (`pnpm install --prod --frozen-lockfile`,
with `prisma generate` run against it) and copy from that instead. Verify the app
still boots — `start.sh` and the Prisma client are the things most likely to need a
package that only exists in the full tree.

**2. No `USER`.** The container runs as root. The `node` image already provides an
unprivileged `node` user; switching to it costs one line plus getting the ownership
right on `.output` and anything `start.sh` writes.

**3. No `HEALTHCHECK`.** Dokploy has no container-level signal for whether the app is
actually serving. The app already exposes a health endpoint (see
`103-health-endpoint-leaks-db-errors.md`) — wire it up.

## Steps to Reproduce

1. Pull `ghcr.io/hdkiller/coach:latest`.
2. `docker run --rm -it --entrypoint sh <image>` then `ls node_modules | wc -l` and
   check for `vitest`, `playwright`, `eslint`.
3. `docker inspect` the image — no `User` and no `Healthcheck` are set.

## Affected Files

- `Dockerfile` (runner stage)
- `start.sh`

## Acceptance Criteria

- [ ] Runner stage installs or copies production dependencies only
- [ ] Image size reduction measured and recorded before/after
- [ ] Container runs as a non-root user
- [ ] `HEALTHCHECK` defined against the existing health endpoint
- [ ] App verified to boot and serve from the hardened image before it reaches Dokploy
