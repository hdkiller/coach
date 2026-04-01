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

## 5. Implementation Roadmap (Updated)

### Phase 1: Core Setup (Completed)

1. Install `@nuxt/content`.
2. Update `nuxt.config.ts`.
3. Create `content/documentation/index.md` with "Hello World".
4. Create a basic `app/pages/documentation/[...slug].vue` to verify rendering.

### Phase 2: Design & Layout (Completed)

1. Implement `app/layouts/docs.vue`.
2. Build the `DocsAside` component.
3. Build the `DocsToc` component.
4. Apply "Prose" styling for beautiful Markdown rendering.

### Phase 3: Navigation & Search (Completed)

1. Implement global search using `UCommandPalette`.
2. Implement Prev/Next pagination links.
3. Add breadcrumbs to documentation pages.

### Phase 4: Initial Content Migration (Completed)

1. Migrate foundational docs from internal `docs/` folder.
2. Structure for Athletes, Coaches, and Developers established.

### Phase 5: Athlete & Nutrition Deep Dives (Highest Impact)

1. **Fueling Logic**: Detailed guide on "Fuel State" (Eco, Steady, Performance) and intensity-based macro scaling.
2. **Metrics & Scoring**: Explanations for TSS, CTL, ATL, and platform-specific wellness scores.
3. **AI Chat Interaction**: Guide on using the AI coach effectively (available tools, best prompts).

### Phase 6: Comprehensive Integration Guides

1. **Source Syncing**: Step-by-step setup for Strava, Garmin, Oura, Whoop, and Intervals.icu.
2. **Intervals.icu Two-Way Sync**: Detailed behavior of how Coach Watts pushes/pulls from Intervals.

### Phase 7: Coaching & Groups

1. **Athlete Management**: How to invite, monitor, and provide feedback to athletes.
2. **Group Analytics**: Aggregating team performance.

### Phase 8: Developer & Architecture Reference

1. **CLI Reference**: Publicly accessible version of `docs/04-guides/cli-reference.md`.
2. **Architecture & Data Flow**: High-level overview of the system for contributors.

## 6. Instructions for Progress Tracking

To maintain an accurate record of implementation, all contributors (human or AI) must:

1. **Mark Phases**: Update the roadmap above by changing `(In Progress)` to `(Completed)` as milestones are reached.
2. **Document Migrations**: When migrating a file from internal `docs/` to `content/documentation/`, ensure any stale internal information is updated to reflect the public API/UI.
3. **Cross-Reference**: Ensure new features are accompanied by a corresponding pull request to update the relevant documentation section.
4. **Validation**: Every new documentation page must be verified for:
   - Correct frontmatter (title/description).
   - Working links (no 404s).
   - Mobile-friendly layout.
   - Code block syntax highlighting.
