# Localization Guide

This document explains how internationalization (i18n) and localization are implemented in Coach Watts using **Tolgee** and **Nuxt UI**.

## 1. Core Technologies

- **[Tolgee](https://tolgee.io/)**: Used for managing translation strings, namespaces, and providing an in-context translation editor during development.
- **[@tolgee/vue](https://tolgee.io/docs/web/using_with_vue/installation)**: The Vue SDK for Tolgee integration.
- **[Nuxt UI Locales](https://ui.nuxt.com/getting-started/i18n)**: Used for standardizing locale names and integrating with Nuxt UI components like `ULocaleSelect`.

## 2. Project Structure

Translations are stored as JSON files in `app/i18n/`, organized by language and namespace:

```text
app/i18n/
├── en/                # English (source of truth)
│   ├── common.json    # Shared strings (nav, footer, CTA)
│   ├── hero.json      # Landing page hero section
│   └── ...
├── hu/                # Hungarian
│   ├── common.json
│   └── ...
└── de/                # German
    ├── common.json
    └── ...
```

Each filename is the **namespace**. One namespace per page or feature area.

## 3. Configuration

### Tolgee Plugin (`app/plugins/tolgee.ts`)

The Tolgee instance is initialized in a Nuxt plugin. It handles:

1. **Static Data**: Importing and registering local JSON files for SSR and initial load.
2. **Language Detection**: Using `@tolgee/web`'s `LanguageDetector` and `LanguageStorage`.
3. **DevTools**: Enabling the in-context editor in development mode when API keys are present.

> **Critical**: Every namespace JSON file must be explicitly imported and added to `staticData` in this plugin. If a namespace is missing here, the page will show raw keys instead of translations — even in English.

### Adding a New Language

To add a new language (e.g., French - `fr`):

1. Create `app/i18n/fr/` and add the necessary JSON files (copy from `en/` as a base).
2. In `app/plugins/tolgee.ts`: import the new files and add them to `staticData`.
3. In `app/components/LanguageSwitcher.vue`: import the locale from `@nuxt/ui/locale` and add it to the `locales` array.

## 4. Translating a Page or Component

Follow these steps every time you add i18n to a new page or component.

### Step 1 — Create the English JSON

Create `app/i18n/en/{namespace}.json` with all translatable strings as flat keys:

```json
{
  "header_title": "Athlete Stories",
  "header_description": "Real athletes achieving peak performance.",
  "cta_button": "Start Your Journey"
}
```

Key naming convention: `section_element` (flat, underscored). No nesting. Match the pattern used in `bento.json`, `community.json`, etc.

### Step 2 — Update the Vue file

```vue
<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('namespace') // matches the JSON filename
</script>

<template>
  <h1>{{ t('header_title') }}</h1>
</template>
```

### Step 3 — Register the namespace in the plugin

In `app/plugins/tolgee.ts`, add two things:

```ts
// 1. Import
import enStories from '../i18n/en/stories.json'
import huStories from '../i18n/hu/stories.json' // only when the file exists

// 2. Register in staticData
staticData: {
  'en:stories': enStories,
  'hu:stories': huStories, // only when the file exists
}
```

Do **not** add a language entry until its translated file actually exists on disk — the import will fail at build time.

### Step 4 — Verify extraction

```bash
npx tolgee extract print --patterns "app/pages/your-page.vue"
```

Should show 0 warnings. If you see `Expected source of t function`, the extractor can't trace `t` back to `useTranslate` — usually because `t` is passed as a prop or used outside `<script setup>`.

### Step 5 — Sync keys to Tolgee platform

**Do not use `pnpm i18n:push` for new namespaces.** The push command does not correctly associate the namespace when creating keys on the platform (known issue with the current `.tolgeerc` push config). Use the CLI instead:

```bash
cw:cli translations sync
```

`sync` reads `useTranslate('namespace')` from the code, so it creates keys with the correct namespace on the platform. After this, set the English values (Step 6).

### Step 6 — Push English values

After `sync` creates the key stubs, push the English values from the local JSON:

```bash
cw:cli translations push-values --namespace <ns>
```

Use `--dry-run` first to preview what will be sent.

### Step 7 — Pull translated files

Once translators complete the other languages in the Tolgee UI:

```bash
pnpm i18n:pull
```

This creates `app/i18n/hu/{namespace}.json` and `app/i18n/de/{namespace}.json`. Then register them in the plugin (Step 3).

## 5. Using `t()` in Script vs Template

`t` from `useTranslate` is a `ComputedRef<Function>`. Vue auto-unwraps it in templates but **not** in `<script setup>`.

| Context                | Syntax                                                 |
| ---------------------- | ------------------------------------------------------ |
| Template               | `{{ t('key') }}`                                       |
| `computed()` in script | `t.value('key')`                                       |
| `useHead()`            | `useHead(computed(() => ({ title: t.value('key') })))` |
| Dynamic data arrays    | `computed(() => [{ label: t.value('key') }])`          |

## 6. npm Scripts

| Command          | What it does                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm i18n:pull` | Pull all translated files from the Tolgee platform                                                  |
| `pnpm i18n:push` | Push `en/` and `hu/` files to the platform — **use only for existing namespaces with known values** |

## 7. `cw:cli translations` Commands

Prefer these over raw Tolgee CLI calls — they handle env vars, error output, and namespace parsing automatically.

| Command                                            | When to use                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `cw:cli translations check`                        | Before pushing — verifies namespace registration in `tolgee.ts` and runs extraction warnings check |
| `cw:cli translations status`                       | Overview of which languages have which namespace JSON files                                        |
| `cw:cli translations list-missing`                 | Lists keys present in code but missing from the platform                                           |
| `cw:cli translations sync`                         | Creates key stubs on the platform with the correct namespace (reads from code)                     |
| `cw:cli translations push-values --namespace <ns>` | Sets English values for an existing namespace via the API                                          |

### Deleting keys from the platform

After deleting keys in the Tolgee UI, always pull to keep local files in sync:

```bash
pnpm i18n:pull
```

Without pulling, the deleted keys remain in local JSON files. The next `pnpm i18n:push` or `cw:cli translations push-values` would re-create them on the platform. Commit the updated JSON files after pulling.

## 8. Development In-Context Editor

1. Set `TOLGEE_API_URL` and `TOLGEE_API_KEY` in `.env`.
2. In development, `Alt + Click` (or `Option + Click`) on any translated string to open the Tolgee dialog.
3. Changes made in the Tolgee UI can be pulled back with `pnpm i18n:pull`.

## 9. Best Practices

1. **One namespace per page/feature** — keep JSON files small and focused. Use `common.json` only for shared elements (nav, footer).
2. **Flat keys** — use `section_element` format (e.g., `header_title`, `cta_button`). Match the convention in `bento.json` and `community.json`. Dotted nesting is supported but only used in `common.json` and `support.json` for historical reasons.
3. **Always register in the plugin** — any namespace not in `staticData` in `tolgee.ts` will render as raw keys.
4. **Use `cw:cli translations sync` for new namespaces** — `pnpm i18n:push` does not correctly namespace new keys on the platform. Use `sync` + `push-values` instead.
5. **Pull after deleting keys** — after deleting keys in the Tolgee UI, run `pnpm i18n:pull` to remove them from local JSON files. Otherwise the next push will re-create them.
6. **English is the source of truth** — always provide an English value for every key. Other languages fall back to English if untranslated.
7. **Proper nouns don't need translation** — names like "Sarah Jenkins" can stay as literals in computed arrays.
