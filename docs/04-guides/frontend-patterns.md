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

```vue
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
```
