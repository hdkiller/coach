# Frontend Patterns

## Nuxt UI Modals

When implementing modals using Nuxt UI (`<UModal>`), follow these best practices to ensure consistent behavior and visibility.

### Key Rules

1.  **Visibility Control:** ALWAYS use `v-model:open="isOpen"` instead of just `v-model="isOpen"`.
    - The `UModal` component in this project (likely v2+) expects the `open` prop.
    - Incorrect usage leads to the modal being always visible or never opening.

2.  **Content Structure:**
    - For standard modals (Header/Body/Footer), use the `#body` and `#footer` slots.
    - For **Full Custom Content** (e.g., replacing the default card style with your own `UCard`):
      - Wrap your content in `<template #content>`.
      - Inside `#content`, place your `UCard` or other container.
      - This ensures the modal shell renders correctly around your custom content.

3.  **Placement:**
    - Place `<UModal>` components at the **top level** of your page template or inside a root layout container.
    - Avoid nesting them deep inside other components that might constrain layout (e.g., `UDashboardPanel` body with `overflow: hidden`) unless you are sure `Teleport` handles it correctly.
    - Ideally, place them just inside the root `<div>` or `UDashboardPanel` (before `#body` or other slots).

### Example: Confirmation Modal

````vue
<template>
  <UDashboardPanel>
    <!-- Modal Placement: Top level within panel -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header>
            <h3>Confirm Action</h3>
          </template>

          <div class="p-4">Are you sure?</div>

          <template #footer>
            <UButton @click="showModal = false">Cancel</UButton>
            <UButton color="red" @click="confirm">Yes</UButton>
          </template>
        </UCard>
      </template>
    </UModal>

    <template #body>
      <!-- Page Content -->
    </template>
  </UDashboardPanel>
</template>

<script setup>
  const showModal = ref(false)
</script>

## Mobile Spacing & Composition

### The "Double Padding" Issue
When nesting container components (e.g., placing a `UCard` inside a `UModal` or `UDashboardPanel`), default padding tokens can compound, significantly reducing usable screen width on mobile devices.

### Edge-to-Edge Pattern (Premium Dashboard)
To maximize usable space and provide a premium "app-like" feel on mobile, follow the **Edge-to-Edge** pattern for dashboard content.

1.  **Remove Outer Padding:** Set `p-0` on the main container for mobile, restoring it for desktop (`sm:p-6`).
2.  **Flatten Cards:** Cards should lose their rounding, shadows, and horizontal borders on small screens.

**Implementation Example:**
```vue
<template #body>
  <div class="max-w-5xl mx-auto w-full p-0 sm:p-6 space-y-4 sm:space-y-8">
    <!-- Edge-to-Edge Header/Card -->
    <div class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-4 sm:p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800">
      Content here
    </div>

    <!-- Nuxt UI Card Override -->
    <UCard :ui="{ root: 'rounded-none sm:rounded-xl shadow-none sm:shadow' }">
       Standard card content
    </UCard>
  </div>
</template>
```

### Best Practices

1.  **Context-Aware Padding:**
    - If a component is intended to be nested, verify its mobile padding.
    - Use `ui` prop overrides to reduce padding in nested contexts.

    ```vue
    <UCard :ui="{ body: 'p-0 sm:p-6' }">
    ```

2.  **Avoid Redundant Wrappers:**
    - Often a `UCard` inside a `UModal` is unnecessary. Use the Modal's built-in structure (`#header`, `#body`, `#footer`) instead of wrapping everything in a Card.

3.  **Flat Variants:**
    - For lists of items (like "Questions" in a modal), use standard `div` elements with specific styling rather than heavy `UCard` components if they don't need the full card shell (shadow, ring, heavy padding).

---

## Charts & Data Visualization

### Stability & Performance
To prevent infinite resize loops (which cause "Layout Shift" and browser hangups), **always** provide a fixed height prop to chart components.

```vue
<!-- ✅ DO THIS -->
<Line :data="data" :options="options" :height="300" />

<!-- ❌ AVOID THIS -->
<Line :data="data" :options="options" class="h-[300px]" />
```

### Visual Standards
- **Typography:** Labels and ticks should use premium small caps: `text-[10px] font-black uppercase tracking-[0.2em] text-gray-400`.
- **Y-Axis:** Prefer right-alignment (`position: 'right'`) to keep data points adjacent to labels.
- **Grids:** Use high-transparency lines: `rgba(0,0,0,0.05)` (light) or `rgba(255,255,255,0.05)` (dark).
- **Ghost Trends:** Use `borderDash: [5, 5]` and `pointRadius: 0` for predicted/future data points.
- **Line Only:** Prefer `fill: false` for trend charts to maintain a clean, high-contrast scientific look.

```

```
````
