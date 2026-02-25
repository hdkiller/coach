# Plan: Public Documentation Implementation via Nuxt Content & Nuxt UI v4

This plan outlines the steps to establish a public-facing documentation section at `/documentation/` using the design patterns from the official [Nuxt UI Docs Template](https://github.com/nuxt-ui-templates/docs), adapted for the project's current Nuxt 4 + @nuxt/ui v4 architecture.

## 1. Objectives

- Establish a public documentation hub at `/documentation`.
- Use Markdown-based content management via `@nuxt/content` v3.
- Replicate the "Docs Template" user experience (Sidebar navigation, Search, TOC).
- Maintain consistency with the existing `@nuxt/ui` v4 design system.

## 2. Infrastructure Setup

### 2.1 Install Dependencies

Install `@nuxt/content` v3 (compatible with Nuxt 4) and its prerequisites.

```bash
pnpm add @nuxt/content@latest
```

### 2.2 Configure `nuxt.config.ts`

Register the module and configure basic settings.

```typescript
modules: [
  '@nuxt/ui',
  '@nuxt/content',
  // ... other modules
],
content: {
  // Configuration for Nuxt Content v3
  // Documentation: https://content.nuxt.com/
}
```

### 2.3 Directory Structure

Initialize the content directory:

```bash
mkdir -p content/documentation
```

Example structure:

- `content/documentation/1.index.md` (Introduction)
- `content/documentation/2.getting-started/index.md`
- `content/documentation/2.getting-started/1.installation.md`
- `content/documentation/3.features/index.md`

## 3. Implementation Details

### 3.1 Documentation Layout (`app/layouts/docs.vue`)

Create a specialized layout focused on content consumption.

- **Header**: Contains the Coach Watts logo, a Documentation label, Global Search, and links to the Dashboard and GitHub.
- **Main Area**: A three-column grid for desktop:
  - **Left Sidebar**: `DocsAside` for hierarchical navigation.
  - **Center**: Main content viewport.
  - **Right Sidebar**: `DocsToc` (Table of Contents).
- **Mobile**: Sidebar becomes a slideover, TOC is hidden or expandable.

### 3.2 Documentation Catch-all Page (`app/pages/documentation/[...slug].vue`)

This page handles all routes under `/documentation/`.

- Use `useContent()` (from Content v3) to fetch the current document and navigation.
- Use `ContentRenderer` to render the Markdown.
- Add breadcrumbs using `UBreadcrumb`.
- Add Prev/Next links at the bottom.

### 3.3 Core Components (Adapted for @nuxt/ui v4)

- **`DocsAside`**: Uses `UNavigationMenu` in vertical orientation. Populated by the `navigation` object from Nuxt Content.
- **`DocsToc`**: A custom component that maps `doc.body.toc.links` to a list of links.
- **`DocsSearch`**: A button that opens a `UModal` containing a `UCommandPalette` configured to search the documentation collection.

## 4. Content Migration Strategy

- Identify public-facing files currently in the root `docs/` directory.
- Copy them to `content/documentation/`.
- Add frontmatter to each file:
  ```markdown
  ---
  title: Getting Started
  description: Learn how to set up your account and sync your first activities.
  ---
  ```

## 5. Implementation Steps (Phased)

### Phase 1: Core Setup

1. Install `@nuxt/content`.
2. Update `nuxt.config.ts`.
3. Create `content/documentation/index.md` with "Hello World".
4. Create a basic `app/pages/documentation/[...slug].vue` to verify rendering.

### Phase 2: Design & Layout

1. Implement `app/layouts/docs.vue`.
2. Build the `DocsAside` component.
3. Build the `DocsToc` component.
4. Apply "Prose" styling to ensure Markdown looks beautiful (Nuxt UI v4 comes with standard prose styles).

### Phase 3: Navigation & Search

1. Implement global search using `UCommandPalette`.
2. Implement Prev/Next pagination links.
3. Add breadcrumbs to the documentation pages.

### Phase 4: Content Population

1. Migrate initial docs from the `docs/` folder.
2. Add screenshots and interactive elements (Alerts, Code blocks).

## 6. Verification

- Verify `/documentation` renders the index page.
- Verify sidebar navigation updates based on folder structure.
- Verify TOC highlights correctly (if using scrollspy).
- Verify mobile responsiveness (Sidebar becomes slideover).
