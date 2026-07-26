# Typechecking

Coach Watts has a large generated Nitro route map, so request typing can dominate TypeScript's work when a call site asks the compiler to compare a general string against every internal route. Use the commands and request boundaries below to keep feedback predictable without disabling strict checking.

## Commands

| Command | Use it for |
| --- | --- |
| `pnpm typecheck` | Canonical clean check. Regenerates Nuxt types first and checks every Nuxt project. Use before handing work off or opening a PR. |
| `pnpm typecheck:prepare` | Refresh `.nuxt` types after changing routes, modules, or Nuxt configuration. |
| `pnpm typecheck:fast` | Check all projects using the existing `.nuxt` tree. Use during normal editing after preparation. |
| `pnpm typecheck:app` | Check only Vue and app code. |
| `pnpm typecheck:server` | Check only server and shared server dependencies. |
| `pnpm typecheck:watch` | Keep the prepared project graph open and report changes continuously. |
| `pnpm typecheck:diagnostics` | Print TypeScript timing, memory, and instantiation counts when investigating a regression. |

The check commands set an 8 GB Node heap ceiling. This is a safety margin for the full Vue project, not a target: unusually high memory or tens of millions of type instantiations should still be investigated.

Run `pnpm typecheck:prepare` before the fast, focused, diagnostic, or watch commands on a fresh checkout. Run it again whenever generated Nuxt types may be stale.

## Fetch typing boundaries

Nuxt's global `$fetch` and `useFetch` provide useful response inference for internal API routes. Keep that inference for literal internal paths when it remains tractable.

For external HTTP services, import `ofetch` from `ofetch`:

```ts
import { ofetch } from 'ofetch'

const result = await ofetch<ExternalResponse>(`${baseUrl}/v1/items`)
```

Do not pass a general external URL to Nuxt's global `$fetch`. Nitro may try to match it against the complete internal route map, multiplying type instantiations across hundreds of routes.

For a dynamic internal route that produces `TS2589` or a measured route-matching hotspot, preserve the response type but widen only the request generic:

```ts
const result = await $fetch<WorkoutResponse, string & {}>(endpoint)

const { data } = await useFetch<WorkoutResponse, Error, string & {}>(endpoint)
```

Use this selectively. Literal internal routes should normally retain Nitro's generated route inference.

## Diagnosing a slowdown

1. Run `pnpm typecheck:prepare` so the generated graph is current.
2. Compare `pnpm typecheck:app` and `pnpm typecheck:server` to locate the expensive project.
3. Run `pnpm typecheck:diagnostics` and note `Instantiations`, `Check time`, and `Memory used`.
4. Look first for `TS2589`, `TS2321`, dynamic `$fetch`/`useFetch` requests, and generic external URLs.
5. Re-run the same focused command after each boundary change; do not treat a larger heap as proof that the regression is fixed.

As a reference, changing the nutrition feeder's three external calls from global `$fetch` to `ofetch` reduced the server check from 42.5 seconds to 17.3 seconds, type instantiations from 31.8 million to 4.0 million, and peak RSS from 5.6 GB to 2.2 GB on the same machine.

## Alternative checker

Nuxt 4.5 can invoke Golar with `nuxt typecheck --checker=golar`. Golar uses the TypeScript 7 codebase and remains an opt-in compatibility experiment; do not replace the canonical Vue TypeScript check until it reports the same project cleanly and its Nuxt/Vue coverage has been validated.
