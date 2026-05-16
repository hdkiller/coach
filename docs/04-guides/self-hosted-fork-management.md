# Self-Hosted Fork Management

This guide explains how to keep your private self-hosted fork up to date with upstream features while preserving your private-instance customisations.

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `master` | Tracks upstream; receives new features via merge |
| `self-hosted` | Deployment branch; contains private-instance customisations on top of master |

You **develop and deploy from `self-hosted`**, never directly from `master`.

## One-Time Setup

```bash
# Add the original repo as upstream remote
git remote add upstream https://github.com/<original-author>/coach

# Create the self-hosted deployment branch from your current master
git checkout -b self-hosted
git push -u origin self-hosted
```

## Pulling Upstream Features

```bash
# 1. Fetch and merge upstream changes into master
git fetch upstream
git checkout master
git merge upstream/master
git push

# 2. Bring those changes into your deployment branch
git checkout self-hosted
git merge master
git push

# 3. Rebuild the container on your server
docker-compose build app && docker-compose up -d
```

## Conflict Risk by File

| File | Risk | Notes |
|------|------|-------|
| `server/api/auth/[...].ts` | **Medium** | Upstream may add providers or change callbacks — keep your `CredentialsProvider` block and `NUXT_PRIVATE_INSTANCE` guard in the `signIn` callback |
| `nuxt.config.ts` | Low | Your additions (`originEnvKey`, Sentry conditional) are small isolated changes |
| `sentry.*.config.ts` | Low | Just reads `process.env.SENTRY_DSN` instead of hardcoded value |
| `Dockerfile`, `docker-compose.yml` | None | Upstream is unlikely to ship Docker infrastructure |
| `.env` | None | Not tracked by git — always preserved on your server |

## Resolving a Conflict in `auth/[...].ts`

When git marks a conflict in the auth handler, your goal is to:

1. **Accept** upstream's new providers or callback changes
2. **Keep** your additions:
   - The `CredentialsProvider` import and provider block (active only when `AUTH_BYPASS_USER` + `AUTH_BYPASS_PASSWORD` are set)
   - The `NUXT_PRIVATE_INSTANCE` guard at the top of the `signIn` callback

```typescript
// Keep this block in the signIn callback:
async signIn({ user }: any) {
  if (process.env.NUXT_PRIVATE_INSTANCE === 'true') {
    const existing = await prisma.user.findUnique({ where: { email: user.email } })
    return !!existing
  }
  return true
},
```

## Private Instance Behaviour Is Env-Var-Controlled

All private-instance features are **off by default** — they activate only when you set env vars in your `.env`. This means:

- Merging upstream code never changes your runtime behaviour
- Your `.env` on the server is the true "private instance config"
- Anyone pulling your fork without setting these vars gets the standard public app

Key vars (see `.env.example` for full documentation):

```
AUTH_BYPASS_USER        # enables local credentials login
AUTH_BYPASS_PASSWORD
NUXT_PRIVATE_INSTANCE   # blocks new account creation when "true"
SENTRY_DSN              # enables Sentry error tracking when set
```
