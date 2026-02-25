<script setup lang="ts">
  const { data: navigation } = await useAsyncData('docs-navigation', () => {
    return queryCollectionNavigation('content')
  })

  // Recursive function to map content navigation to UNavigationMenu items
  function mapNavigation(items: any[]) {
    if (!items) return []
    return items.map((item) => ({
      label: item.title || item.path.split('/').pop(),
      to: item.path,
      children:
        item.children && item.children.length > 0 ? mapNavigation(item.children) : undefined,
      defaultOpen: true
    }))
  }

  const menuItems = computed(() => {
    if (!navigation.value || navigation.value.length === 0) return []

    // Attempt to find the root /documentation item if it exists
    const docsNav = navigation.value.find((n) => n.path === '/documentation')

    // If we found a root /documentation item, use its children
    if (docsNav && docsNav.children) {
      return mapNavigation(docsNav.children)
    }

    // Otherwise, return the top-level items (which are likely /athletes and /developers)
    return mapNavigation(navigation.value)
  })
</script>

<template>
  <aside
    class="sticky top-[--header-height] h-[calc(100vh-var(--header-height))] overflow-y-auto py-8 pr-4"
  >
    <div v-if="menuItems.length">
      <UNavigationMenu :items="menuItems" orientation="vertical" class="w-full" />
    </div>
    <div v-else class="text-sm text-gray-500 py-4 italic">No documentation links found.</div>
  </aside>
</template>
