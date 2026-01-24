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

## Mobile Spacing & Composition ### The "Double Padding" Issue When nesting container components
(e.g., placing a `UCard` inside a `UModal` or `UDashboardPanel`), default padding tokens can
compound, significantly reducing usable screen width on mobile devices. **Example of Anti-Pattern:**
```vue
<!-- UModal adds p-4, UCard adds p-4. Result: 32px padding on each side (64px lost width). -->
<UModal>
  <template #body>
    <UCard>
      Content
    </UCard>
  </template>
</UModal>
````

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

```

```
