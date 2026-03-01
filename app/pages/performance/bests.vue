<template>
  <UDashboardPanel id="performance-bests">
    <template #header>
      <UDashboardNavbar title="All-Time Personal Bests">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/performance">
            Back to Performance
          </UButton>
        </template>
        <template #right>
          <ClientOnly>
            <DashboardTriggerMonitorButton />
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6 pb-24 max-w-5xl mx-auto">
        <!-- Header Branding -->
        <div>
          <h1
            class="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic"
          >
            Trophy Case
          </h1>
          <p
            class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1"
          >
            Your historic peak performances across all disciplines.
          </p>
        </div>

        <div v-if="pending" class="flex justify-center py-24">
          <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary-500" />
        </div>

        <div v-else-if="data" class="space-y-8">
          <TrophyCase :personal-bests="data.personalBests || []" />
        </div>

        <div v-else class="text-center py-24">
          <p class="text-gray-500">Failed to load personal bests.</p>
          <UButton color="primary" variant="subtle" class="mt-4" @click="() => refresh()"
            >Retry</UButton
          >
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import TrophyCase from '~/components/profile/TrophyCase.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Personal Bests | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'View your all-time records and peak performances detected by Coach Watts.'
      }
    ]
  })

  // Fetch athlete profile data which includes personalBests
  const { data, pending, refresh } = await useFetch<any>('/api/scores/athlete-profile', {
    key: 'athlete-profile-bests'
  })
</script>
