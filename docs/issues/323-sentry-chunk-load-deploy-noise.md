# 323 — Sentry Chunk Load / Deploy Noise

**Type:** Ops / known noise  
**Priority:** Low  
**Area:** `infra, frontend`  
**Status:** Handled (monitor)

## Description

After a deploy, clients with a stale HTML document still request old hashed `/_nuxt/*.js` chunks. Those URLs 404 → browsers throw dynamic-import / module-script failures (often on `/chat`). Vue may then throw a secondary minified render error.

This is expected SPA/Nuxt deploy churn, not a `/chat` logic bug.

## Related Sentry issues

| Issue                                                                  | Message pattern                             | Role                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| [COACH-WATTS-C](https://newpush-y4.sentry.io/issues/COACH-WATTS-C)     | `error loading dynamically imported module` | Primary chunk miss                                         |
| [COACH-WATTS-9](https://newpush-y4.sentry.io/issues/COACH-WATTS-9)     | `Importing a module script failed`          | Same class (Safari / iOS wording)                          |
| [COACH-WATTS-1ER](https://newpush-y4.sentry.io/issues/COACH-WATTS-1ER) | `can't access property "p", e is undefined` | Secondary Vue cascade (same user/trace as C on 2026-07-17) |
| COACH-WATTS-D / 57 / 1E9                                               | Related chunk / fetch failures              | Same cluster historically                                  |

## Handling already in place

1. **Auto-reload once** — `app/plugins/chunk-error.client.ts` (`app:chunkError` + `window` `error` fallback), 10s `sessionStorage` loop guard, `?reload=` cache bust.
2. **Early head listener** — inline script in `nuxt.config.ts` for failures before the Nuxt plugin runs.
3. **Sentry hygiene** — `ignoreErrors` in `sentry.client.config.ts` for the common chunk messages.

## Do / don’t

- **Do** treat C / 9 as known noise; verify reload works after a real deploy if volume spikes or users report blank pages.
- **Do** watch 1ER for recurrence _without_ a paired chunk error before investigating Vue code.
- **Don’t** add generic minified Vue messages (e.g. `can't access property "p"`) to `ignoreErrors` — that can hide real bugs.
- **Do** extend `ignoreErrors` / `beforeSend` only for new _chunk-load message variants_ that slip through.

## Out of scope

[PLATFORM-CA](https://newpush-y4.sentry.io/issues/PLATFORM-CA) (`fbq is not defined`) is GTM / Meta Pixel on `platform.newpush.com`, not coach-watts.

## Acceptance Criteria

- [x] Product mitigation: auto-reload on chunk failure
- [x] Sentry: common chunk strings in `ignoreErrors`
- [x] Documented in [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md)
- [ ] Optional: resolve/ignore C / 9 in Sentry as confirmed noise after next quiet deploy window
- [ ] Optional: resolve 1ER if it stays a one-off cascade
