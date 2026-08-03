<template>
  <UDashboardPanel id="check-in">
    <template #header>
      <UDashboardNavbar title="Weekly Check-In">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <UTabs :items="tabs" class="w-full">
          <template #progress>
            <div class="mt-4">
              <RoadOfTrialsChart />
            </div>
          </template>

          <template #submit>
            <div class="mt-4">
              <UCard>
                <template #header>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Submit Check-In
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Log your weekly metrics to give your coach a complete picture.
                  </p>
                </template>
                <CheckInForm @success="onCheckInSuccess" />
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const tabs = [
    { label: 'My Progress', slot: 'progress', icon: 'i-heroicons-chart-bar' },
    { label: 'Submit Check-In', slot: 'submit', icon: 'i-heroicons-clipboard-document-check' }
  ]

  definePageMeta({
    middleware: 'auth'
  })

  const onCheckInSuccess = () => {
    // Could switch tabs or show a success state, toast is handled by CheckInForm
  }
</script>
