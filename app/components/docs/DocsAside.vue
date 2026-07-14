<script setup lang="ts">
  const route = useRoute()
  const { data: navigation } = await useAsyncData('docs-navigation', () => {
    return queryCollectionNavigation('content')
  })

  const athleteNavigationOrder = [
    '/documentation/athletes',
    '/documentation/athletes/getting-started',
    '/documentation/athletes/features',
    '/documentation/athletes/dashboard-daily-flow',
    '/documentation/athletes/chat-interaction',
    '/documentation/athletes/account-profile',
    '/documentation/athletes/settings',
    '/documentation/athletes/integrations',
    '/documentation/athletes/activities-workouts',
    '/documentation/athletes/activity-management',
    '/documentation/athletes/duplicate-workouts',
    '/documentation/athletes/workout-details',
    '/documentation/athletes/data-management',
    '/documentation/athletes/training-plans',
    '/documentation/athletes/recommendations',
    '/documentation/athletes/library',
    '/documentation/athletes/performance',
    '/documentation/athletes/analytics-tools',
    '/documentation/athletes/nutrition',
    '/documentation/athletes/fueling-logic',
    '/documentation/athletes/recovery-wellness',
    '/documentation/athletes/metrics-scoring',
    '/documentation/athletes/goals-events',
    '/documentation/athletes/reports',
    '/documentation/athletes/mcp-server'
  ]

  const settingsNavigationOrder = [
    '/documentation/athletes/settings',
    '/documentation/athletes/settings/basic-profile',
    '/documentation/athletes/settings/sport-profiles',
    '/documentation/athletes/settings/measurements-availability',
    '/documentation/athletes/settings/nutrition-settings',
    '/documentation/athletes/settings/ai-coach',
    '/documentation/athletes/settings/apps-sync',
    '/documentation/athletes/settings/billing',
    '/documentation/athletes/settings/data-privacy',
    '/documentation/athletes/settings/developer'
  ]

  const coachNavigationOrder = [
    '/documentation/coaches',
    '/documentation/coaches/connecting-athletes',
    '/documentation/coaches/invitations-requests',
    '/documentation/coaches/strategic-overview',
    '/documentation/coaches/athlete-roster-profiles',
    '/documentation/coaches/acting-as-athlete',
    '/documentation/coaches/coaching-calendar',
    '/documentation/coaches/coach-library',
    '/documentation/coaches/coach-analytics',
    '/documentation/coaches/athlete-groups',
    '/documentation/coaches/team-management',
    '/documentation/coaches/messaging-ai-review',
    '/documentation/coaches/coach-settings-public-presence',
    '/documentation/coaches/start-direct-invite-pages',
    '/documentation/coaches/permissions-privacy'
  ]

  const navigationRank = new Map(
    [
      ...new Set([...athleteNavigationOrder, ...settingsNavigationOrder, ...coachNavigationOrder])
    ].map((path, index) => [path, index])
  )

  function sortNavigation(items: any[]): any[] {
    return [...items].sort((a, b) => {
      const aRank = navigationRank.get(a.path) ?? Number.MAX_SAFE_INTEGER
      const bRank = navigationRank.get(b.path) ?? Number.MAX_SAFE_INTEGER
      return aRank - bRank
    })
  }

  // Recursive function to map content navigation to UNavigationMenu items
  function mapNavigation(items: any[]): any[] {
    if (!items) return []
    return sortNavigation(items).map((item) => {
      const children = item.children?.filter((child: any) => child.path !== item.path) || []
      const hasChildren = children.length > 0
      return {
        label: item.title || item.path.split('/').pop(),
        to: item.path,
        children: hasChildren ? mapNavigation(children) : undefined,
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
