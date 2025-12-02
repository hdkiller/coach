<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <div>
          <h2 class="text-2xl font-bold">Welcome to Coach Watts!</h2>
          <p class="mt-2 text-muted">Your AI-powered cycling coach is ready to help you optimize your training.</p>
        </div>
      
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UCard v-if="!intervalsConnected">
            <template #header>
              <h3 class="font-semibold">Getting Started</h3>
            </template>
            <p class="text-sm text-muted">
              Connect your Intervals.icu account to start analyzing your training data.
            </p>
            <template #footer>
              <UButton to="/settings" block>
                Connect Intervals.icu
              </UButton>
            </template>
          </UCard>
          
          <UCard v-else>
            <template #header>
              <h3 class="font-semibold">Connection Status</h3>
            </template>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-success" />
                <span class="text-sm">Intervals.icu connected</span>
              </div>
              <p class="text-sm text-muted">
                Your training data is being synced automatically.
              </p>
            </div>
            <template #footer>
              <UButton to="/reports" block variant="outline">
                View Reports
              </UButton>
            </template>
          </UCard>
          
          <UCard>
            <template #header>
              <h3 class="font-semibold">Recent Activity</h3>
            </template>
            <p v-if="!intervalsConnected" class="text-sm text-muted text-center py-4">
              No workouts found. Connect your Intervals.icu account to sync your training data.
            </p>
            <p v-else class="text-sm text-muted text-center py-4">
              Your workouts are syncing. Check back soon or view the Reports page.
            </p>
          </UCard>
        </div>
      
        <UCard>
          <template #header>
            <h3 class="font-semibold">Next Steps</h3>
          </template>
          <ul class="space-y-2 text-sm text-muted">
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-success" />
              Account created successfully
            </li>
            <li class="flex items-center gap-2">
              <UIcon
                :name="intervalsConnected ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'"
                :class="intervalsConnected ? 'w-5 h-5 text-success' : 'w-5 h-5'"
              />
              Connect Intervals.icu
            </li>
            <li class="flex items-center gap-2">
              <UIcon
                :name="intervalsConnected ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'"
                :class="intervalsConnected ? 'w-5 h-5 text-success' : 'w-5 h-5'"
              />
              Sync your training data
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
              Get your first AI coaching report
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

// Integration status - use lazy to avoid SSR issues
const { data: integrationStatus } = useFetch('/api/integrations/status', {
  lazy: true,
  server: false
})

const intervalsConnected = computed(() =>
  integrationStatus.value?.integrations?.some((i: any) => i.provider === 'intervals') ?? false
)
</script>