<template>
  <UDashboardPanel id="ai-logs">
    <template #header>
      <UDashboardNavbar title="AI Usage Logs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div>
          <h2 class="text-2xl font-bold">AI Activity History</h2>
          <p class="text-muted mt-1">Detailed log of all AI-powered operations and their costs.</p>
        </div>

        <ClientOnly>
          <SettingsAiUsageHistory />
        </ClientOnly>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'AI Usage Logs',
    meta: [
      {
        name: 'description',
        content: 'View historical AI usage logs, performance metrics, and costs.'
      }
    ]
  })
</script>
