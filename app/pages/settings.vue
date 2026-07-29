<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <LayoutMobileToolbarTabs
          :items="settingsTabs"
          :active-id="activeSettingsTab"
          select-label="Settings sections"
          @select="navigateToSettingsTab"
        />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="w-full p-0 sm:p-6" :class="isFullWidth ? 'max-w-full' : 'max-w-4xl mx-auto'">
        <div class="px-4 sm:px-0">
          <NuxtPage />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const route = useRoute()

  const settingsTabs = [
    { id: '/settings/apps', label: 'Connected Apps', icon: 'i-lucide-plug' },
    { id: '/settings/ai', label: 'AI Coach', icon: 'i-heroicons-sparkles' },
    { id: '/settings/billing', label: 'Billing', icon: 'i-heroicons-credit-card' },
    { id: '/settings/developer', label: 'Developer', icon: 'i-heroicons-code-bracket' },
    { id: '/settings/danger', label: 'Danger Zone', icon: 'i-lucide-alert-triangle' }
  ]

  const activeSettingsTab = computed(() => {
    const match = settingsTabs.find((tab) => isActive(tab.id))
    return match?.id || '/settings/apps'
  })

  function navigateToSettingsTab(path: string) {
    void navigateTo(path)
  }

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Settings',
    meta: [
      {
        name: 'description',
        content:
          'Manage your Journey Endurance Coaching account, connected apps, and AI preferences.'
      }
    ]
  })

  function isActive(path: string): boolean {
    return route.path === path
  }

  const isFullWidth = computed(() => {
    return (
      route.path === '/settings/ai' ||
      route.path.startsWith('/settings/llm') ||
      route.path === '/settings/billing'
    )
  })
</script>
