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

## Forms & Inputs

Follow these standards to create consistent, high-density, and user-friendly forms across the application.

### Form Structure

1.  **Logical Sections:** Group related fields using a consistent section header pattern.
    - Use an icon, small caps title (`text-sm font-bold uppercase`), and a subtle bottom border.
    - Add descriptive text to `UFormField` to explain complex metrics.

    ```vue
    <section class="space-y-4">
      <div class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
        <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-primary" />
        <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
          Section Title
        </h4>
      </div>
      <!-- Fields here -->
    </section>
    ```

2.  **Grid Layouts:** Use `grid grid-cols-1 md:grid-cols-2 gap-6` for technical metrics to keep forms compact on desktop while remaining accessible on mobile.

3.  **Scroll Management:** For complex modals with many fields, set a `max-height` (e.g., `max-h-[70vh]`) and `overflow-y-auto` on the form container to ensure action buttons in the footer remain visible.

### Input Standards

1.  **Inline Units:** Numerical fields MUST show their units using the `#trailing` slot of `UInput`.
    - Format: `text-xs font-bold text-gray-400`.
    - Examples: `h`, `m`, `s`, `km`, `m`, `TSS`, `kcal`.

    ```vue
    <UInput v-model.number="value" type="number">
      <template #trailing>
        <span class="text-xs font-bold text-gray-400">km</span>
      </template>
    </UInput>
    ```

2.  **Uniform Dimensions:** For related side-by-side inputs (like Duration hours/minutes/seconds), use identical fixed widths (e.g., `class="w-24"`) to maintain visual alignment.

3.  **Smart Estimation:** When a value can be derived from other fields (e.g., Estimating Calories from Duration), provide an "Estimate" button in the `#trailing` slot.
    - Style: `variant="link" size="xs" font-bold uppercase tracking-widest text-[9px]`.

4.  **Description Field:** Always place the large-form text area (`UTextarea`) at the bottom of its section or the form to provide maximum vertical expansion space.

### Validation Patterns

1.  **Zod Integration:** Use `UForm` with a Zod schema.
2.  **Explicit Type Casting:** Use `.number` modifier on `v-model` for numeric fields to ensure the form state matches the database schema.
3.  **Loading States:** Action buttons MUST use the `:loading` prop during API submissions.
```

```
````
