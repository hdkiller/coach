<script setup lang="ts">
  const route = useRoute()
  const { data: navigation } = await useAsyncData('docs-navigation', () => {
    return queryCollectionNavigation('content')
  })

  // Recursive function to map content navigation to UNavigationMenu items
  function mapNavigation(items: any[]): any[] {
    if (!items) return []
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0
      return {
        label: item.title || item.path.split('/').pop(),
        to: item.path,
        children: hasChildren ? mapNavigation(item.children) : undefined,
        defaultOpen: true,
        // If it's a folder, we might want to ensure it's expanded if we are inside it
        active: route.path === item.path || route.path.startsWith(item.path + '/')
      }
    })
  }

  const menuItems = computed(() => {
    if (!navigation.value || navigation.value.length === 0) return []

    // 1. Find the root /documentation node
    const docsNav = navigation.value.find((n) => n.path === '/documentation')
    const rootItems = docsNav?.children || navigation.value

    // 2. Find which top-level section we are in (Athletes, Developers, etc.)
    const activeSection = rootItems.find((section) => route.path.startsWith(section.path))

    // 3. If we're in a section, show its children as the sidebar root
    if (activeSection && activeSection.children) {
      return mapNavigation(activeSection.children)
    }

    // 4. Otherwise show the top-level sections
    return mapNavigation(rootItems)
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
