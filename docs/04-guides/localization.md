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
├── en/                # English (Base)
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

## 3. Configuration

### Tolgee Plugin (`app/plugins/tolgee.ts`)

The Tolgee instance is initialized in a Nuxt plugin. It handles:

1.  **Static Data**: Importing and registering local JSON files for SSR and initial load.
2.  **Language Detection**: Using `@tolgee/web`'s `LanguageDetector` and `LanguageStorage`.
3.  **DevTools**: Enabling the in-context editor in development mode when API keys are present.

### Adding a New Language

To add a new language (e.g., French - `fr`):

1.  **Create Directory**: Create `app/i18n/fr/` and add the necessary JSON files (copy from `en/` as a base).
2.  **Update Plugin**: In `app/plugins/tolgee.ts`:
    - Import the new JSON files.
    - Add them to the `staticData` object in `tolgee.init`.
3.  **Update Switcher**: In `app/components/LanguageSwitcher.vue`:
    - Import the locale from `@nuxt/ui/locale` (e.g., `import { fr } from '@nuxt/ui/locale'`).
    - Add it to the `locales` array.

## 4. Usage in Components

### Basic Translation

Use the `useTranslate` composable from `@tolgee/vue`:

```vue
<script setup>
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('common') // 'common' is the namespace
</script>

<template>
  <h1>{{ t('hero.title') }}</h1>
</template>
```

### Language Switching

The `LanguageSwitcher.vue` component uses `ULocaleSelect` to provide a standardized dropdown:

```vue
<template>
  <ULocaleSelect v-model="selectedLanguage" :locales="locales" />
</template>
```

## 5. Development & Tolgee UI

If you have a Tolgee project set up, you can use the in-context editor:

1.  Set `TOLGEE_API_URL` and `TOLGEE_API_KEY` in your `.env`.
2.  In development, `Alt + Click` (or `Option + Click`) on any translated string to open the Tolgee translation dialog.
3.  Changes made in the Tolgee UI can be exported back to the JSON files.

## 6. Best Practices

1.  **Namespacing**: Keep translation files small and focused. Use `common.json` for site-wide elements and feature-specific files (e.g., `nutrition.json`) for specific pages.
2.  **Fallback**: Always provide an English version of every string as it is the fallback language.
3.  **Keys**: Use descriptive, hierarchical keys (e.g., `nav.links.pricing`) to make them easy to find.
4.  **No Hardcoding**: Avoid hardcoding strings in templates. If a string is visible to the user, it should be in a translation file.
